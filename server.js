const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const express = require('express');
const OpenAI = require('openai');

const app = express();
const port = 3000;
const clientDistDir = path.join(__dirname, 'client', 'dist');
const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const tokenSecret = process.env.AUTH_DEMO_SECRET || 'local-auth-demo-secret';
const hfModel = process.env.HF_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

app.use(express.json());

app.use((req, res, next) => {
    const startedAt = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startedAt;
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });

    next();
});

app.use(express.static(clientDistDir));

async function ensureUsersFile() {
    await fs.mkdir(dataDir, { recursive: true });

    try {
        await fs.access(usersFile);
    } catch {
        await fs.writeFile(usersFile, '[]', 'utf8');
    }
}

async function readUsers() {
    await ensureUsersFile();
    const usersJson = await fs.readFile(usersFile, 'utf8');
    return JSON.parse(usersJson);
}

async function writeUsers(users) {
    await ensureUsersFile();
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function validateRegisterInput({ name, email, password }) {
    const errors = [];
    const normalizedName = String(name || '').trim();
    const normalizedEmail = normalizeEmail(email);

    if (normalizedName.length < 2) {
        errors.push('Name must be at least 2 characters.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        errors.push('Enter a valid email address.');
    }

    if (String(password || '').length < 6) {
        errors.push('Password must be at least 6 characters.');
    }

    return {
        errors,
        values: {
            name: normalizedName,
            email: normalizedEmail,
            password: String(password || ''),
        },
    };
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
    const [salt, originalHash] = storedPassword.split(':');
    const passwordHash = crypto.scryptSync(password, salt, 64);
    const originalHashBuffer = Buffer.from(originalHash, 'hex');

    return (
        originalHashBuffer.length === passwordHash.length &&
        crypto.timingSafeEqual(originalHashBuffer, passwordHash)
    );
}

function safeUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
    };
}

function toBase64Url(value) {
    return Buffer.from(value).toString('base64url');
}

function createToken(user) {
    const payload = toBase64Url(JSON.stringify({ userId: user.id, issuedAt: Date.now() }));
    const signature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

function readToken(req) {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    return scheme === 'Bearer' ? token : null;
}

function verifyToken(token) {
    if (!token || !token.includes('.')) {
        return null;
    }

    const [payload, signature] = token.split('.');
    const expectedSignature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        return null;
    }

    try {
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
}

async function authenticateRequest(req, res, next) {
    const tokenData = verifyToken(readToken(req));

    if (!tokenData) {
        return res.status(401).json({ message: 'You must be logged in to use this feature.' });
    }

    const users = await readUsers();
    const user = users.find((candidate) => candidate.id === tokenData.userId);

    if (!user) {
        return res.status(401).json({ message: 'Your session is no longer valid.' });
    }

    req.user = safeUser(user);
    next();
}

function createHuggingFaceClient() {
    if (!process.env.HF_TOKEN) {
        return null;
    }

    return new OpenAI({
        baseURL: 'https://router.huggingface.co/v1',
        apiKey: process.env.HF_TOKEN,
    });
}

function sanitizeChatMessages(messages) {
    if (!Array.isArray(messages)) {
        return [];
    }

    return messages
        .filter((message) => ['user', 'assistant'].includes(message.role))
        .map((message) => ({
            role: message.role,
            content: String(message.content || '').trim(),
        }))
        .filter((message) => message.content.length > 0)
        .slice(-12);
}

app.post('/api/auth/register', async (req, res) => {
    const { errors, values } = validateRegisterInput(req.body);

    if (errors.length > 0) {
        return res.status(400).json({ message: 'Please fix the highlighted fields.', errors });
    }

    const users = await readUsers();
    const emailTaken = users.some((user) => user.email === values.email);

    if (emailTaken) {
        return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const user = {
        id: crypto.randomUUID(),
        name: values.name,
        email: values.email,
        passwordHash: hashPassword(values.password),
        createdAt: new Date().toISOString(),
    };

    users.push(user);
    await writeUsers(users);

    return res.status(201).json({
        message: 'Account created successfully.',
        token: createToken(user),
        user: safeUser(user),
    });
});

app.post('/api/auth/login', async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    const users = await readUsers();
    const user = users.find((candidate) => candidate.email === email);

    if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({
        message: 'Logged in successfully.',
        token: createToken(user),
        user: safeUser(user),
    });
});

app.get('/api/me', authenticateRequest, (req, res) => {
    return res.json({ user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
    return res.json({ message: 'Logged out successfully.' });
});

app.post('/api/chat', authenticateRequest, async (req, res) => {
    const messages = sanitizeChatMessages(req.body.messages);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

    if (!latestUserMessage) {
        return res.status(400).json({ message: 'Send at least one user message.' });
    }

    if (latestUserMessage.content.length > 4000) {
        return res.status(400).json({ message: 'Please keep each message under 4000 characters.' });
    }

    const client = createHuggingFaceClient();

    if (!client) {
        return res.status(503).json({
            message: 'HF_TOKEN is not configured. Add your Hugging Face token before sending real model requests.',
        });
    }

    try {
        const completion = await client.chat.completions.create({
            model: hfModel,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a concise, practical AI coding and learning assistant. Explain concepts clearly, ask follow-up questions only when needed, and prefer actionable examples.',
                },
                ...messages,
            ],
            temperature: 0.7,
            max_tokens: 700,
        });

        const reply = completion.choices?.[0]?.message?.content?.trim();

        if (!reply) {
            return res.status(502).json({ message: 'The model did not return a usable response.' });
        }

        return res.json({
            message: reply,
            model: hfModel,
            user: req.user,
        });
    } catch (error) {
        console.error('Hugging Face request failed:', error.message);
        return res.status(502).json({
            message: 'Hugging Face could not complete the request. Check your token, model name, or provider access.',
        });
    }
});

app.get(/^\/(?!api).*/, (req, res, next) => {
    res.sendFile(path.join(clientDistDir, 'index.html'), (error) => {
        if (error) {
            next();
        }
    });
});

app.listen(port, () => {
    console.log(`Auth chatbot API running at http://localhost:${port}`);
    console.log('REST requests will appear here as you use the React app.');

    if (!process.env.HF_TOKEN) {
        console.log('HF_TOKEN is not set yet. The chat UI will show a setup error until you add it.');
    } else {
        console.log(`Hugging Face model: ${hfModel}`);
    }
});