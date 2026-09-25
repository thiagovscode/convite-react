/**
 * ==============================================================================
 * SCRIPT DE BACKUP AUTOMÁTICO DO MONGODB POR EVENTO DE NOVO RSVP
 * ==============================================================================
 * 
 * Regra: Só gera e envia o backup quando houver um NOVO registro na collection
 * de confirmação de presença (rsvp_casamento). Não envia se não houver novos dados.
 * 
 * Variáveis necessárias (.env ou variáveis de ambiente):
 * - MONGODB_URI: String de conexão com o MongoDB (Atlas ou Local)
 * - SMTP_HOST: Servidor SMTP (ex: smtp.gmail.com)
 * - SMTP_PORT: Porta SMTP (ex: 587 ou 465)
 * - SMTP_USERNAME: Usuário do e-mail
 * - SMTP_PASSWORD: Senha de aplicativo do e-mail
 * - BACKUP_EMAIL_TO: Destinatário do backup
 * - BACKUP_EMAIL_FROM: Remetente do e-mail
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import zlib from 'zlib';

const execAsync = promisify(exec);
const gzipAsync = promisify(zlib.gzip);

// 1. Carregar variáveis de ambiente de .env ou .env.backup
function loadEnv() {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.backup'),
    path.resolve(process.cwd(), '../convite-backend-v2/.env'),
    path.resolve(process.cwd(), '../convite-cha-de-panela/.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            const val = match[2].trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  }
}

loadEnv();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/convite-casamento';
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USERNAME = process.env.SMTP_USERNAME;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const BACKUP_EMAIL_TO = process.env.BACKUP_EMAIL_TO;
const BACKUP_EMAIL_FROM = process.env.BACKUP_EMAIL_FROM || SMTP_USERNAME;
const POLL_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_SECONDS || '10') * 1000;
const COLLECTION_NAME = process.env.COLLECTION_NAME || 'rsvp_casamento';

console.log('');
console.log('💍 ══════════════════════════════════════════════════════ 💍');
console.log('   MONITOR DE BACKUP AUTOMÁTICO DE RSVP — CASAMENTO');
console.log('   Envia backup SOMENTE quando houver novo RSVP registrado');
console.log('💍 ══════════════════════════════════════════════════════ 💍');
console.log(`📡 MongoDB URI: ${MONGODB_URI.replace(/:([^:@]+)@/, ':****@')}`);
console.log(`📦 Collection monitorada: ${COLLECTION_NAME}`);
console.log(`⏱️  Intervalo de verificação: ${POLL_INTERVAL_MS / 1000}s`);
console.log(`📧 Destinatário do backup: ${BACKUP_EMAIL_TO || 'Não configurado (configure BACKUP_EMAIL_TO)'}`);
console.log('──────────────────────────────────────────────────────────');

let lastKnownCount = null;
let lastKnownId = null;

// Envio de E-mail via Nodemailer ou fetch/SMTP
async function sendBackupEmail(backupFilePath, newRecordDetails) {
  if (!SMTP_HOST || !SMTP_USERNAME || !SMTP_PASSWORD || !BACKUP_EMAIL_TO) {
    console.warn('⚠️  Credenciais SMTP incompletas no .env. Backup gerado em disco mas e-mail não enviado.');
    return;
  }

  try {
    let nodemailer;
    try {
      nodemailer = (await import('nodemailer')).default;
    } catch {
      console.warn('⚠️  Pacote nodemailer não instalado. Execute: npm install nodemailer');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USERNAME,
        pass: SMTP_PASSWORD,
      },
    });

    const dataBr = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date());

    const fileSizeMb = (fs.statSync(backupFilePath).size / (1024 * 1024)).toFixed(2);
    const fileName = path.basename(backupFilePath);

    const subject = `💍 [Novo RSVP] Backup MongoDB — Casamento Tainara & Thiago — ${newRecordDetails?.nome || 'Novo Convidado'} — ${dataBr}`;

    const textBody = `
Backup automático do MongoDB acionado por NOVA CONFIRMAÇÃO DE PRESENÇA.

──────────────────────────────────────────────────────────────
NOVA CONFIRMAÇÃO REGISTRADA NO BANCO DE DADOS:
──────────────────────────────────────────────────────────────
• Convidado: ${newRecordDetails?.nome || 'N/A'}
• Telefone: ${newRecordDetails?.telefone || 'N/A'}
• E-mail: ${newRecordDetails?.email || 'Não informado'}
• Presença: ${newRecordDetails?.presenca ? '✅ SIM, CONFIRMADA' : '❌ NÃO COMPARECERÁ'}
• Total de Pessoas: ${newRecordDetails?.totalPessoas || 1}
• Adultos / ≥ 7 anos: ${newRecordDetails?.adultos || 1}
• Crianças menores de 7 anos: ${newRecordDetails?.criancasAte6Anos || 0}
${newRecordDetails?.acompanhantes?.length ? `• Acompanhantes:\n${newRecordDetails.acompanhantes.map(a => `   - ${a.nome} (${a.criancaAte6Anos ? 'Criança < 7 anos' : 'Adulto / ≥ 7 anos'})`).join('\n')}` : ''}
${newRecordDetails?.observacao ? `• Observação / Mensagem: "${newRecordDetails.observacao}"` : ''}

──────────────────────────────────────────────────────────────
INFORMAÇÕES DO ARQUIVO DE BACKUP:
──────────────────────────────────────────────────────────────
• Data do Backup: ${dataBr}
• Arquivo: ${fileName}
• Tamanho: ${fileSizeMb} MB
• Collection: ${COLLECTION_NAME}

O arquivo de backup completo encontra-se em anexo a este e-mail.
    `.trim();

    console.log(`📤 Enviando e-mail com anexo para ${BACKUP_EMAIL_TO}...`);

    await transporter.sendMail({
      from: BACKUP_EMAIL_FROM,
      to: BACKUP_EMAIL_TO,
      subject: subject,
      text: textBody,
      attachments: [
        {
          filename: fileName,
          path: backupFilePath,
        },
      ],
    });

    console.log(`✅ E-mail de backup enviado com sucesso para ${BACKUP_EMAIL_TO}!`);
  } catch (err) {
    console.error(`❌ Erro ao enviar e-mail de backup:`, err.message);
  }
}

// Geração do Arquivo de Backup (.archive.gz ou .json.gz)
async function generateBackup(db) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const archivePath = path.join(backupsDir, `mongodb-backup-${timestamp}.archive.gz`);

  // Tenta rodar o mongodump se disponível no sistema
  try {
    const cmd = `mongodump --uri="${MONGODB_URI}" --archive="${archivePath}" --gzip`;
    await execAsync(cmd);
    console.log(`✓ Backup binário gerado via mongodump: ${archivePath}`);
    return archivePath;
  } catch (dumpErr) {
    // Se mongodump não estiver instalado na máquina, faz o export com o driver nativo do MongoDB
    console.log('ℹ️  mongodump CLI não encontrado no PATH. Gerando backup via driver MongoDB nativo (JSON.GZ)...');
    
    const collections = await db.listCollections().toArray();
    const backupData = {
      createdAt: new Date().toISOString(),
      database: db.databaseName,
      collections: {},
    };

    for (const col of collections) {
      const docs = await db.collection(col.name).find({}).toArray();
      backupData.collections[col.name] = docs;
    }

    const jsonStr = JSON.stringify(backupData, null, 2);
    const compressed = await gzipAsync(Buffer.from(jsonStr, 'utf8'));

    const jsonGzPath = path.join(backupsDir, `mongodb-backup-${timestamp}.json.gz`);
    fs.writeFileSync(jsonGzPath, compressed);
    console.log(`✓ Backup comprimido gerado via driver: ${jsonGzPath}`);
    return jsonGzPath;
  }
}

// Loop Principal de Monitoramento
async function startMonitor() {
  let MongoClient;
  try {
    const mongodbModule = await import('mongodb');
    MongoClient = mongodbModule.MongoClient;
  } catch {
    console.error('❌ Módulo "mongodb" não encontrado. Instale com: npm install mongodb nodemailer');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Conectado com sucesso ao MongoDB!');
    const db = client.db();
    const collection = db.collection(COLLECTION_NAME);

    // Estado inicial
    const currentCount = await collection.countDocuments();
    lastKnownCount = currentCount;
    const latestDoc = await collection.findOne({}, { sort: { _id: -1 } });
    lastKnownId = latestDoc ? latestDoc._id.toString() : null;

    console.log(`📊 Total inicial de registros em "${COLLECTION_NAME}": ${currentCount}`);
    console.log('👀 Aguardando novos registros de RSVP para acionar o backup...');

    // Polling contínuo
    setInterval(async () => {
      try {
        const count = await collection.countDocuments();
        
        // Verifica se houve aumento no número de documentos
        if (lastKnownCount !== null && count > lastKnownCount) {
          const novidades = count - lastKnownCount;
          console.log(`\n🚨 [NOVA CONFIRMAÇÃO DETECTADA!] +${novidades} novo(s) registro(s) encontrado(s)!`);

          // Busca o último documento inserido
          const newDoc = await collection.findOne({}, { sort: { _id: -1 } });
          lastKnownCount = count;
          lastKnownId = newDoc ? newDoc._id.toString() : lastKnownId;

          // Extrai os detalhes do convidado
          const detalhes = {
            nome: newDoc?.nome || 'Convidado',
            telefone: newDoc?.telefone || '',
            email: newDoc?.email || '',
            presenca: newDoc?.presenca !== false,
            acompanhantes: newDoc?.acompanhantes || [],
            totalPessoas: (newDoc?.acompanhantes?.length || 0) + 1,
            adultos: 1 + (newDoc?.acompanhantes?.filter(a => !a.criancaAte6Anos)?.length || 0),
            criancasAte6Anos: newDoc?.acompanhantes?.filter(a => a.criancaAte6Anos)?.length || 0,
            observacao: newDoc?.observacao || '',
          };

          console.log(`👤 Convidado: ${detalhes.nome} | Telefone: ${detalhes.telefone}`);
          console.log(`👥 Total: ${detalhes.totalPessoas} pessoas (${detalhes.adultos} adultos/≥7 anos, ${detalhes.criancasAte6Anos} menores de 7 anos)`);

          // 1. Gera o backup completo
          const backupFile = await generateBackup(db);

          // 2. Envia por e-mail com anexo
          await sendBackupEmail(backupFile, detalhes);

          console.log('👀 Monitoramento retomado. Aguardando próximas confirmações...\n');
        } else {
          lastKnownCount = count;
        }
      } catch (checkErr) {
        console.error('⚠️  Erro no ciclo de verificação:', checkErr.message);
      }
    }, POLL_INTERVAL_MS);

  } catch (err) {
    console.error('❌ Erro de conexão com o MongoDB:', err.message);
    process.exit(1);
  }
}

startMonitor();
