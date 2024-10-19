const express = require('express');
const bodyParser = require('body-parser');
const { PrismaClient } = require('@prisma/client');
const joi = require('joi');
const app = express();
const port = 3000;
const prisma = new PrismaClient();

app.use(bodyParser.json());

const userSchema = joi.object({
    name: joi.string().min(3).max(30).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
    identity_type: joi.string().valid('KTP', 'SIM', 'PASSPORT').required(),
    identity_number: joi.number().integer().required()
});
const bankAccountsSchema = joi.object({
    bank_name: joi.string().required(),
    bank_account_number: joi.number().integer().required(),
    balance: joi.number().integer().required(),
    user_Id: joi.number().integer().required()
});
const updateBankAccountSchema = joi.object({
    bank_name: joi.string().required(),
    bank_account_number: joi.number().integer().required(),
    balance: joi.number().integer().required()
});
const transactionSchema = joi.object({
    source_account_id: joi.number().integer().required(),
    destination_account_id: joi.number().integer().required(),
    amount: joi.number().integer().required()
});

app.post('/api/v1/users', async (req, res) => {
    const { error, value } = userSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, password, identity_type, identity_number } = value;

    try {
        const existingUser = await prisma.users.findUnique({
            where: { email: email }
        });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already exists.' });
        }
        const existingProfile = await prisma.profiles.findUnique({
            where: { identity_number: identity_number }
        });
        if (existingProfile) {
            return res.status(409).json({ error: 'Identity number already exists.' });
        }
        let user = await prisma.users.create({
            data: {
                name: name,
                email: email,
                password: password,
                profiles: {
                    create: {
                        identity_type: identity_type,
                        identity_number: identity_number
                    }
                }
            },
            include: {
                profiles: true
            }
        });

        res.status(201).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
app.get('/api/v1/users', async (req, res) => {
    try {
        let users = await prisma.users.findMany({
            orderBy: {
                id: 'asc'
            }
        });

        return res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
app.get('/api/v1/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        let user = await prisma.users.findUnique({
            where: { id: parseInt(id) },
            include: {
                profiles: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
app.put('/api/v1/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password, identity_type, identity_number } = req.body;

    const { error } = userSchema.validate({ name, email, password, identity_type, identity_number });
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const existingUser = await prisma.users.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }
        const emailCheck = await prisma.users.findFirst({
            where: {
                email: email,
                NOT: {
                    id: parseInt(id)
                }
            }
        });
        if (emailCheck) {
            return res.status(409).json({ error: 'Email already exists for another user.' });
        }
        const identityCheck = await prisma.profiles.findUnique({
            where: {
                identity_number: identity_number,
                NOT: {
                    user_Id: parseInt(id)
                }
            }
        });
        if (identityCheck) {
            return res.status(409).json({ error: 'Identity number already exists for another user.' });
        }
        let updatedUser = await prisma.users.update({
            where: { id: parseInt(id) },
            data: {
                name: name,
                email: email,
                password: password,
                profiles: {
                    update: {
                        identity_type: identity_type,
                        identity_number: identity_number
                    }
                }
            },
            include: {
                profiles: true
            }
        });

        return res.json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});
app.post('/api/v1/accounts', async (req, res) => {
    const { error, value } = bankAccountsSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }
    const { bank_name, bank_account_number, balance, user_Id } = value;

    try {
        const user = await prisma.users.findUnique({
            where: { id: user_Id }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const existingAccount = await prisma.bank_accounts.findUnique({
            where: { bank_account_number: parseInt(bank_account_number) }
        });
        if (existingAccount) {
            return res.status(409).json({ error: 'Bank account number already exists' });
        }
        let bank_account = await prisma.bank_accounts.create({
            data: {
                bank_name,
                bank_account_number,
                balance,
                user_Id
            }
        });
        res.status(201).json(bank_account);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.get('/api/v1/accounts', async (req,res)=>{
    try{
        let bank_account = await prisma.bank_accounts.findMany({
            orderBy: {
                id: 'asc'
            }
        })
        return res.json(bank_account)
    }catch (err){
        console.error(err)
        res.status(500).json({error: 'internal server eror'})
    }
})

app.get('/api/v1/accounts/:id', async (req,res)=>{
    const {id} = req.params
    try {
        let bank_account = await prisma.bank_accounts.findUnique({
            where: { id: parseInt(id) },
            include:{
                users: true
            }
        });

        if (!bank_account){
            return res.status(404).json({error: ' bank account not found'})
        }
        const formattedResponse = {
            id: bank_account.id,
            bank_name: bank_account.bank_name,
            bank_account_number: bank_account.bank_account_number,
            balance: bank_account.balance,
            user: {
                id: bank_account.users.id,
                name: bank_account.users.name,
                email: bank_account.users.email
            }
        };

        return res.json(formattedResponse);
    }catch (err){
        console.error(err)
        res.status(500).json({error: 'internal server eror'})
    }
})

app.put('/api/v1/accounts/:id', async (req, res) => {
    const { id } = req.params;
    const { bank_name, bank_account_number, balance } = req.body;

    const { error } = updateBankAccountSchema.validate({ bank_name, bank_account_number, balance });
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    try {
        const existingAccount = await prisma.bank_accounts.findUnique({
            where: { id: parseInt(id) }
        });
        if (!existingAccount) {
            return res.status(404).json({ error: 'Account not found' });
        }
        const bankNumberCheck = await prisma.bank_accounts.findFirst({
            where: {
                bank_account_number: bank_account_number,
                NOT: {
                    id: parseInt(id)
                }
            }
        });
        if (bankNumberCheck) {
            return res.status(409).json({ error: 'Account number already registered' });
        }
        let updateBankAccount = await prisma.bank_accounts.update({
            where: { id: parseInt(id) },
            data: {
                bank_name: bank_name,
                bank_account_number: bank_account_number,
                balance: balance
            }
        });
        return res.json(updateBankAccount);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/v1/transactions', async (req, res) => {
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    const { source_account_id, destination_account_id, amount } = value;

    try {
        const existingSourceAccount = await prisma.bank_accounts.findUnique({
            where: { id: source_account_id }
        });
        const existingDestinationAccount = await prisma.bank_accounts.findUnique({
            where: { id: destination_account_id }
        });
        if (!existingSourceAccount || !existingDestinationAccount) {
            return res.status(404).json({ error: 'Source or destination account not found' });
        }
        if (existingSourceAccount.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        await prisma.$transaction([
            prisma.bank_accounts.update({
                where: { id: source_account_id },
                data: { balance: existingSourceAccount.balance - amount }
            }),
            prisma.bank_accounts.update({
                where: { id: destination_account_id },
                data: { balance: existingDestinationAccount.balance + amount }
            }),
            prisma.transaction.create({
                data: {
                    source_account_id,
                    destination_account_id,
                    amount
                }
            })
        ]);

        return res.status(201).json({ success: true, message: 'Transaction successful' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/v1/transactions', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            include: {
                source: true,
                destination: true 
            }
        });

        return res.json(transactions);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/v1/transactions', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            include: {
                source: {
                    select: {
                        id: true,
                        bank_name: true,
                        bank_account_number: true,
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                destination: {
                    select: {
                        id: true,
                        bank_name: true,
                        bank_account_number: true,
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        return res.json(transactions);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/v1/transactions/:transactionId', async (req, res) => {
    const { transactionId } = req.params;

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transactionId) },
            include: {
                source: {
                    select: {
                        id: true,
                        bank_name: true,
                        bank_account_number: true,
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                destination: {
                    select: {
                        id: true,
                        bank_name: true,
                        bank_account_number: true,
                        users: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.json(transaction);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
app.delete('/api/v1/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const user = await prisma.users.findUnique({
            where: { id: parseInt(id) },
            include: { profiles: true } // Sertakan profile terkait
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Hapus profile terkait terlebih dahulu
        if (user.profiles) {
            await prisma.profiles.delete({
                where: { user_Id: parseInt(id) }
            });
        }

        // Setelah profile dihapus, hapus user
        await prisma.users.delete({
            where: { id: parseInt(id) }
        });

        return res.json({ message: 'User and related profile deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


app.delete('/api/v1/accounts/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const account = await prisma.bank_accounts.findUnique({
            where: { id: parseInt(id) }
        });

        if (!account) {
            return res.status(404).json({ error: 'Bank account not found' });
        }

        await prisma.bank_accounts.delete({
            where: { id: parseInt(id) }
        });

        return res.json({ message: 'Bank account deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});


app.delete('/api/v1/transactions/:transactionId', async (req, res) => {
    const { transactionId } = req.params;

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(transactionId) }
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        await prisma.transaction.delete({
            where: { id: parseInt(transactionId) }
        });

        return res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});




app.listen(port, () =>
    console.log(`Server is running on port ${port}`)
);
