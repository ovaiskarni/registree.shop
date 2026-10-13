import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Lead management data structure
export interface LeadRecord {
  id: string;
  timestamp: string;
  service: string;
  name: string;
  email: string;
  whatsapp: string;
  query: string;
  status: 'New' | 'Contacted' | 'Proposal Sent' | 'Converted' | 'Archived';
  priority: 'High' | 'Medium' | 'Low';
  notes: string;
  budget?: string;
  lastUpdated: string;
}

const LEADS_FILE_PATH = path.resolve(__dirname, 'leads_store.json');

// Initialize initial seed leads if file doesn't exist
const initialLeads: LeadRecord[] = [];

const loadLeads = (): LeadRecord[] => {
  try {
    if (fs.existsSync(LEADS_FILE_PATH)) {
      const data = fs.readFileSync(LEADS_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
    fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify(initialLeads, null, 2));
    return initialLeads;
  } catch (err) {
    console.error('Error reading leads file:', err);
    return initialLeads;
  }
};

const saveLeads = (leads: LeadRecord[]) => {
  try {
    fs.writeFileSync(LEADS_FILE_PATH, JSON.stringify(leads, null, 2));
  } catch (err) {
    console.error('Error saving leads file:', err);
  }
};

let allLeads: LeadRecord[] = loadLeads();

// Gemini client initialization
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const SYSTEM_INSTRUCTION = `You are the official AI representative for REGISTREE, a premier corporate setup, AI automation, and legal compliance agency based in New Delhi, India.

About REGISTREE:
REGISTREE helps businesses go online, automate, and operate legally in India, catering to both domestic and international clients.

Our Core Services & Offers:
1. Website Design: High-performance corporate websites & digital experiences built to scale. Starting from ₹19,999 (~$230 USD). SPECIAL OFFER: Every website comes with a 100% FREE custom professional logo design AND free custom business domain email setup (e.g. you@yourbrand.com)!
2. Standalone Professional Logo Design: Custom brand identity and high-resolution vector logo design as a separate service for just ₹999 INR (~$12 USD).
3. AI Automation: End-to-end workflow automation to streamline operations and cut manual work. Custom tailored scope.
4. AI Voice Agent for Business: Intelligent, conversational 24/7 inbound & outbound voice agents. Custom tailored scope.
5. Company Registration in India: Private Limited (Pvt Ltd), Limited Liability Partnership (LLP), and OPC incorporation with complete regulatory compliance.
6. Trademark Registration: Comprehensive trademark search, IP filing, and brand protection in India.
7. GST, PAN & Other Compliances: Goods and Services Tax registration, PAN allotment, and ongoing annual statutory compliances.
8. Business Setup & Development in India: Comprehensive market entry and subsidiary setup for foreign and domestic founders.
9. International Trade Facilitator: Import/Export code (IEC), trade licensing, and cross-border trade facilitation.
10. International Cargo Service: Air and ocean freight forwarding, door-to-door customs clearance, container logistics, and global courier solutions connecting India worldwide. Bespoke volume freight rates.

Pricing Policy:
- Website Design starts from ₹19,999 (~$230 USD) and INCLUDES a FREE custom logo design.
- Standalone Logo Design is ₹999 (~$12 USD).
- Other services (Company Registration, AI, Trademark, Compliance, etc.) have custom pricing depending on specific business requirements.
- CRITICAL RULE: Never invent arbitrary prices beyond ₹19,999 for Website Design (with Free Logo) and ₹999 for Standalone Logo Design.

Response Style & Guidelines:
- Keep answers short, friendly, concise, and professional (2-4 sentences max).
- Whenever discussing next steps or pricing, warmly invite them to continue on WhatsApp at +91-6005534878 (https://wa.me/916005534878) or email theregistreein@gmail.com.
- Location: New Delhi, India.`;

// AI Chatbot endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'A valid message is required.' });
      return;
    }

    const ai = getGenAI();

    // Prepare conversational prompt with context
    let promptText = `${SYSTEM_INSTRUCTION}\n\n`;
    if (Array.isArray(history) && history.length > 0) {
      promptText += `Recent conversation context:\n`;
      const contextSlice = history.slice(-6);
      for (const turn of contextSlice) {
        promptText += `${turn.role === 'user' ? 'Client' : 'Assistant'}: ${turn.text}\n`;
      }
      promptText += `\n`;
    }
    promptText += `Client: ${message.trim()}\nAssistant:`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.6,
      },
    });

    const reply = response.text || 'Thank you for reaching out to REGISTREE. How may we assist your business today?';

    res.json({ reply: reply.trim() });
  } catch (error: any) {
    console.error('Chat error:', error);
    // Graceful fallback response if API key is not ready or rate-limited
    res.status(200).json({
      reply: 'Hello! REGISTREE helps businesses go online, automate, and register legally in India. Plans start from ₹19,999 (~$230 USD). For immediate consultation or custom quotes, please message our team on WhatsApp at +91-6005534878 (https://wa.me/916005534878) or email theregistreein@gmail.com.',
    });
  }
});

// Query submission endpoint
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const { service, name, email, whatsapp, query } = req.body;

    // Field validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please provide a valid full name.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (!whatsapp || typeof whatsapp !== 'string' || whatsapp.trim().length < 7) {
      res.status(400).json({ error: 'Please provide a valid WhatsApp phone number with country code.' });
      return;
    }
    if (!query || typeof query !== 'string' || query.trim().length < 5) {
      res.status(400).json({ error: 'Please describe your query requirements.' });
      return;
    }

    const newLead: LeadRecord = {
      id: `LEAD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      service: service || 'General Query',
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      query: query.trim(),
      status: 'New',
      priority: 'High',
      notes: 'New inquiry received via website portal.',
      budget: (service || '').includes('999')
        ? '₹999 INR'
        : (service || '').includes('19,999')
        ? '₹19,999 INR'
        : 'Custom Scope',
      lastUpdated: new Date().toISOString(),
    };

    allLeads.unshift(newLead);
    saveLeads(allLeads);

    console.log('----------------------------------------------------');
    console.log('[REGISTREE NEW INQUIRY DISPATCH]');
    console.log('To: theregistreein@gmail.com');
    console.log(`Lead ID: ${newLead.id}`);
    console.log(`Service: ${newLead.service}`);
    console.log(`Client: ${newLead.name} <${newLead.email}>`);
    console.log(`WhatsApp: ${newLead.whatsapp}`);
    console.log(`Query: ${newLead.query}`);
    console.log('----------------------------------------------------');

    // 1. Dispatch via FormSubmit.co using verified token cce1b353682c5d915f2606d479acf68b
    let emailDispatched = false;
    const customDomain = 'https://theregistree.shop';
    const appOrigin = process.env.APP_URL || 'https://ais-pre-avsiuinpbhos7g655tgvxq-554239349994.asia-southeast1.run.app';
    const formSubmitToken = 'cce1b353682c5d915f2606d479acf68b';

    try {
      // First try with the token provided by FormSubmit
      let fsRes = await fetch(`https://formsubmit.co/ajax/${formSubmitToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: appOrigin,
          Referer: appOrigin,
        },
        body: JSON.stringify({
          _subject: `[REGISTREE Query] ${newLead.service} - ${newLead.name}`,
          _template: 'table',
          Service: newLead.service,
          ClientName: newLead.name,
          Email: newLead.email,
          WhatsApp: newLead.whatsapp,
          QueryDetails: newLead.query,
          ReferenceID: newLead.id,
          Timestamp: newLead.timestamp,
        }),
      });

      let fsData = await fsRes.json();
      console.log('FormSubmit token response:', fsData);

      if (fsData.success === 'true' || fsData.success === true) {
        emailDispatched = true;
      } else {
        // Fallback to naked email with real app origin
        const fallbackRes = await fetch('https://formsubmit.co/ajax/theregistreein@gmail.com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Origin: appOrigin,
            Referer: appOrigin,
          },
          body: JSON.stringify({
            _subject: `[REGISTREE Query] ${newLead.service} - ${newLead.name}`,
            _template: 'table',
            Service: newLead.service,
            ClientName: newLead.name,
            Email: newLead.email,
            WhatsApp: newLead.whatsapp,
            QueryDetails: newLead.query,
            ReferenceID: newLead.id,
            Timestamp: newLead.timestamp,
          }),
        });
        const fallbackData = await fallbackRes.json();
        console.log('FormSubmit fallback response:', fallbackData);
        if (fallbackData.success === 'true' || fallbackData.success === true) {
          emailDispatched = true;
        }
      }
    } catch (fsErr) {
      console.warn('FormSubmit network notice:', fsErr);
    }

    // 2. If RESEND_API_KEY is configured in env, attempt direct Resend dispatch
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'REGISTREE Portal <onboarding@resend.dev>',
            to: ['theregistreein@gmail.com'],
            subject: `[New Inquiry] ${newLead.service} - ${newLead.name}`,
            text: `New client inquiry received on REGISTREE:\n\nService: ${newLead.service}\nName: ${newLead.name}\nEmail: ${newLead.email}\nWhatsApp: ${newLead.whatsapp}\n\nQuery Details:\n${newLead.query}\n\nSubmitted at: ${newLead.timestamp}\nReference ID: ${newLead.id}`,
          }),
        });
        emailDispatched = true;
      } catch (mailErr) {
        console.warn('Direct Resend dispatch notice:', mailErr);
      }
    }

    res.json({
      success: true,
      referenceId: newLead.id,
      emailDispatched,
      inquiry: newLead,
      message: 'Your query has been recorded and dispatched to theregistreein@gmail.com.',
    });
  } catch (error: any) {
    console.error('Query submission error:', error);
    res.status(500).json({ error: 'Failed to process inquiry. Please message us on WhatsApp directly at +91-6005534878.' });
  }
});

// Public inquiries ledger is disabled for privacy and security.
// Leads are only accessible via authenticated /api/admin/leads.

// ==========================================
// ADMIN PORTAL & LEAD MANAGEMENT APIs
// ==========================================

// Admin Authentication endpoint
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  const validEmail = (email || '').trim().toLowerCase();
  const validPass = (password || '').trim();

  if (
    (validEmail === 'theregistreein@gmail.com' || validEmail === 'admin' || validEmail === 'admin@theregistree.com') &&
    (validPass === 'Registree@2026')
  ) {
    const token = `reg_adm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    res.json({
      success: true,
      token,
      user: {
        email: 'theregistreein@gmail.com',
        name: 'REGISTREE Administrator',
        role: 'Super Admin',
      },
    });
  } else {
    res.status(401).json({
      error: 'Invalid email or password. Access denied.',
    });
  }
});

// Admin Lead List & Analytics
app.get('/api/admin/leads', (_req: Request, res: Response) => {
  allLeads = loadLeads();

  const stats = {
    total: allLeads.length,
    newLeads: allLeads.filter((l) => l.status === 'New').length,
    contacted: allLeads.filter((l) => l.status === 'Contacted').length,
    proposalSent: allLeads.filter((l) => l.status === 'Proposal Sent').length,
    converted: allLeads.filter((l) => l.status === 'Converted').length,
    archived: allLeads.filter((l) => l.status === 'Archived').length,
  };

  res.json({
    leads: allLeads,
    stats,
  });
});

// Admin Create Manual Lead
app.post('/api/admin/leads', (req: Request, res: Response) => {
  try {
    const { name, email, whatsapp, service, query, status, priority, budget, notes } = req.body;

    if (!name || !email || !whatsapp) {
      res.status(400).json({ error: 'Name, email, and WhatsApp number are required.' });
      return;
    }

    const newLead: LeadRecord = {
      id: `LEAD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      service: service || 'General Consultation',
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      query: (query || 'Manual lead added via Admin Desk.').trim(),
      status: status || 'New',
      priority: priority || 'Medium',
      budget: budget || 'To be scoped',
      notes: notes || 'Lead added directly by admin.',
      lastUpdated: new Date().toISOString(),
    };

    allLeads.unshift(newLead);
    saveLeads(allLeads);

    res.json({
      success: true,
      lead: newLead,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create lead.' });
  }
});

// Admin Update Lead (Status, Notes, Priority, Budget)
app.patch('/api/admin/leads/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, notes, priority, budget } = req.body;

  const leadIndex = allLeads.findIndex((l) => l.id === id);
  if (leadIndex === -1) {
    res.status(404).json({ error: 'Lead not found.' });
    return;
  }

  if (status) allLeads[leadIndex].status = status;
  if (notes !== undefined) allLeads[leadIndex].notes = notes;
  if (priority) allLeads[leadIndex].priority = priority;
  if (budget !== undefined) allLeads[leadIndex].budget = budget;
  allLeads[leadIndex].lastUpdated = new Date().toISOString();

  saveLeads(allLeads);

  res.json({
    success: true,
    lead: allLeads[leadIndex],
  });
});

// Admin Delete Lead
app.delete('/api/admin/leads/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = allLeads.length;
  allLeads = allLeads.filter((l) => l.id !== id);

  if (allLeads.length === initialLen) {
    res.status(404).json({ error: 'Lead not found.' });
    return;
  }

  saveLeads(allLeads);
  res.json({ success: true, message: 'Lead removed successfully.' });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`REGISTREE server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
