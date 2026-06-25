import express from 'express';
import path from 'path';
import fs from 'fs';
import dgram from 'dgram';
import net from 'net';
import { createServer as createViteServer } from 'vite';
import initSqlJs from 'sql.js';
import { Client as SSHClient } from 'ssh2';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'qbc_server_db.json');
const SQLITE_DATA_FILE = path.join(process.cwd(), 'qbc_sqlite_extracted.json');
const SECRET_KEY_MASTER = 'QBC2026';

let SQL: any = null;

async function getSql() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

// SFTP download helper
function sftpDownloadToBuffer(config: any, remoteFilePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        const chunks: Buffer[] = [];
        const stream = sftp.createReadStream(remoteFilePath);
        
        stream.on('data', (chunk) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });
        
        stream.on('end', () => {
          conn.end();
          resolve(Buffer.concat(chunks));
        });
        
        stream.on('error', (streamErr) => {
          conn.end();
          reject(streamErr);
        });
      });
    }).on('error', (connErr) => {
      reject(connErr);
    }).connect(config);
  });
}

// SFTP list directory helper
function sftpListDir(config: any, remotePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const conn = new SSHClient();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        sftp.readdir(remotePath, (readErr, list) => {
          conn.end();
          if (readErr) {
            return reject(readErr);
          }
          resolve(list.map(item => {
            const isDir = item.attrs && typeof item.attrs.isDirectory === 'function'
              ? item.attrs.isDirectory()
              : (item.longname ? item.longname.startsWith('d') : false);
            return {
              name: item.filename,
              isDirectory: isDir,
              size: item.attrs ? item.attrs.size : 0
            };
          }));
        });
      });
    }).on('error', (connErr) => {
      reject(connErr);
    }).connect(config);
  });
}

// Creature mapping helper
function getCreatureName(templateId: number, nameField?: string): { fr: string, en: string, icon: string } {
  if (nameField && nameField.length > 2 && !nameField.toLowerCase().startsWith('creature')) {
    return { fr: nameField, en: nameField, icon: '🐾' };
  }
  const mapping: { [key: number]: { fr: string, en: string, icon: string } } = {
    1: { fr: 'Citoyen / Humain', en: 'Human / Citizen', icon: '🧑' },
    2: { fr: 'Ours brun', en: 'Brown bear', icon: '🐻' },
    3: { fr: 'Ours noir', en: 'Black bear', icon: '🐻' },
    4: { fr: 'Ours des cavernes', en: 'Cave bear', icon: '🐻' },
    10: { fr: 'Cougar sauvage', en: 'Wild cougar', icon: '🐈' },
    11: { fr: 'Crocodile des marais', en: 'Swamp crocodile', icon: '🐊' },
    12: { fr: 'Cerf élaphe', en: 'Red deer', icon: '🦌' },
    13: { fr: 'Loup de chasse', en: 'Hunting dog', icon: '🐕' },
    14: { fr: 'Poulain', en: 'Foal', icon: '🐎' },
    15: { fr: 'Poule pondeuse', en: 'Laying hen', icon: '🐓' },
    16: { fr: 'Cheval sauvage', en: 'Wild horse', icon: '🐎' },
    21: { fr: 'Taureau de trait', en: 'Draft bull', icon: '🐂' },
    22: { fr: 'Vache laitière', en: 'Dairy cow', icon: '🐄' },
    23: { fr: 'Cochon rose', en: 'Pink pig', icon: '🐖' },
    26: { fr: 'Dragonnet de feu', en: 'Fire dragon hatchling', icon: '🐉' },
    39: { fr: 'Gobelin agressif', en: 'Aggressive goblin', icon: '👺' },
    42: { fr: 'Chat de forêt', en: 'Forest cat', icon: '🐱' },
    43: { fr: 'Loup affamé', en: 'Starving wolf', icon: '🐺' },
    46: { fr: 'Rat géant', en: 'Giant rat', icon: '🐀' },
    49: { fr: 'Anaconda géant', en: 'Giant anaconda', icon: '🐍' },
    52: { fr: 'Araignée géante', en: 'Giant spider', icon: '🕷️' },
    53: { fr: 'Araignée de lave', en: 'Lava spider', icon: '🕷️' },
    54: { fr: 'Démon de lave', en: 'Lava fiend', icon: '🔥' },
    60: { fr: 'Sanglier furieux', en: 'Furious boar', icon: '🐗' },
    68: { fr: 'Licorne céleste', en: 'Celestial unicorn', icon: '🦄' },
    81: { fr: 'Dragon noir ancestral', en: 'Ancient Black Dragon', icon: '🐉' },
    82: { fr: 'Dragon rouge légendaire', en: 'Legendary Red Dragon', icon: '🐉' },
    83: { fr: 'Dragon bleu mythique', en: 'Mythical Blue Dragon', icon: '🐉' },
    84: { fr: 'Dragon blanc des neiges', en: 'White Snow Dragon', icon: '🐉' },
    85: { fr: 'Géant des forêts', en: 'Forest giant', icon: '👹' }
  };
  return mapping[templateId] || { fr: `Créature #${templateId}`, en: `Creature #${templateId}`, icon: '🐾' };
}

// Read sqlite extracted data helper
function readSqliteData() {
  try {
    if (fs.existsSync(SQLITE_DATA_FILE)) {
      const content = fs.readFileSync(SQLITE_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.totalKills === undefined || parsed.totalKills === null) {
        parsed.totalKills = 1438;
      }
      if (!parsed.creatures) {
        parsed.creatures = null;
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading SQLite extracted data:', err);
  }
  return { villages: null, players: null, creatures: null, totalKills: 1438, lastUpdated: null };
}

// Write sqlite extracted data helper
function writeSqliteData(data: any) {
  try {
    fs.writeFileSync(SQLITE_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing SQLite extracted data:', err);
  }
}

// Function to parse a Wurm Unlimited SQLite database
async function parseSqliteFile(buffer: Buffer, originalName: string) {
  const sql = await getSql();
  const db = new sql.Database(buffer);
  
  const result: { type: 'zones' | 'players' | 'unknown'; villages?: any[]; players?: any[]; creatures?: any[] } = {
    type: 'unknown'
  };

  try {
    // 1. Check if table VILLAGES exists (it is wurmzones.db)
    const checkVillages = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='VILLAGES'");
    if (checkVillages.length > 0) {
      result.type = 'zones';
      const villages: any[] = [];
      const res = db.exec("SELECT * FROM VILLAGES");
      if (res.length > 0) {
        const columns = res[0].columns;
        const values = res[0].values;
        
        const idxId = columns.indexOf('ID');
        const idxName = columns.indexOf('NAME');
        const idxMayor = columns.indexOf('MAYOR');
        const idxStartX = columns.indexOf('STARTX');
        const idxStartY = columns.indexOf('STARTY');
        const idxEndX = columns.indexOf('ENDX');
        const idxEndY = columns.indexOf('ENDY');
        
        for (const row of values) {
          const id = String(row[idxId] || Math.random());
          const name = String(row[idxName] || 'Deed Inconnu');
          const mayor = idxMayor !== -1 ? String(row[idxMayor] || 'Maire') : 'Maire';
          
          const startX = idxStartX !== -1 ? Number(row[idxStartX]) : 2000;
          const startY = idxStartY !== -1 ? Number(row[idxStartY]) : 2000;
          const endX = idxEndX !== -1 ? Number(row[idxEndX]) : 2100;
          const endY = idxEndY !== -1 ? Number(row[idxEndY]) : 2100;
          
          // Wurm Unlimited map size auto-detection
          let mapSize = 4096;
          if (startX > 4096 || endX > 4096 || startY > 4096 || endY > 4096) {
            mapSize = 8192;
          } else if (startX <= 1024 && endX <= 1024 && startY <= 1024 && endY <= 1024) {
            mapSize = 1024;
          } else if (startX <= 2048 && endX <= 2048 && startY <= 2048 && endY <= 2048) {
            mapSize = 2048;
          }
          
          const xTile = (startX + endX) / 2;
          const yTile = (startY + endY) / 2;
          const xPercent = (xTile / mapSize) * 100;
          const yPercent = (yTile / mapSize) * 100;
          
          const sizeX = Math.abs(endX - startX);
          const sizeY = Math.abs(endY - startY);
          
          villages.push({
            id,
            name,
            mayor,
            citizens: 1, 
            sizeX,
            sizeY,
            x: Number(xPercent.toFixed(2)),
            y: Number(yPercent.toFixed(2)),
            guards: 4,
            hasSpiritTemplar: sizeX > 40,
            desc_fr: `Deed extrait de SQLite. Dimensions: ${sizeX}x${sizeY} tuiles. Origine: (${startX}, ${startY})`,
            desc_en: `Deed extracted from SQLite. Size: ${sizeX}x${sizeY} tiles. Origin: (${startX}, ${startY})`
          });
        }
      }
      
      // Load counts from VILLAGE_CITIZENS if it exists
      try {
        const checkCit = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='VILLAGE_CITIZENS'");
        if (checkCit.length > 0) {
          const resCit = db.exec("SELECT VILLAGEID, COUNT(*) as count FROM VILLAGE_CITIZENS GROUP BY VILLAGEID");
          if (resCit.length > 0) {
            for (const row of resCit[0].values) {
              const villageId = String(row[0]);
              const count = Number(row[1]);
              const v = villages.find(v => v.id === villageId);
              if (v) v.citizens = count;
            }
          }
        }
      } catch (citErr) {
        console.error('Error reading citizen counts:', citErr);
      }

      // Extract active creatures count from CREATURES table if it exists
      const creatures: any[] = [];
      try {
        const checkCreatures = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='CREATURES'");
        if (checkCreatures.length > 0) {
          const resCre = db.exec("SELECT TEMPLATEID, COUNT(*) as count FROM CREATURES GROUP BY TEMPLATEID");
          if (resCre.length > 0) {
            const cols = resCre[0].columns;
            const vals = resCre[0].values;
            const idxTemplate = cols.indexOf('TEMPLATEID');
            const idxQty = cols.indexOf('count') !== -1 ? cols.indexOf('count') : 1;
            
            for (const row of vals) {
              const templateId = Number(row[idxTemplate]);
              const qty = Number(row[idxQty]);
              const details = getCreatureName(templateId);
              creatures.push({
                templateId,
                qty,
                name_fr: details.fr,
                name_en: details.en,
                icon: details.icon
              });
            }
          }
        }
      } catch (creErr) {
        console.error('Error reading creatures table:', creErr);
      }
      
      result.creatures = creatures;
      result.villages = villages;
    }
    
    // 2. Check if table PLAYERS exists (it is wurmplayers.db)
    const checkPlayers = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='PLAYERS'");
    if (checkPlayers.length > 0) {
      result.type = 'players';
      const players: any[] = [];
      const res = db.exec("SELECT * FROM PLAYERS LIMIT 250");
      if (res.length > 0) {
        const columns = res[0].columns;
        const values = res[0].values;
        
        const idxWurmid = columns.indexOf('WURMID');
        const idxName = columns.indexOf('NAME');
        const idxKingdom = columns.indexOf('KINGDOM');
        const idxPower = columns.indexOf('POWER');
        const idxAlignment = columns.indexOf('ALIGNMENT');
        const idxLastLogout = columns.indexOf('LASTLOGOUT');
        
        for (const row of values) {
          const id = String(row[idxWurmid] || Math.random());
          const name = String(row[idxName] || 'Wurmer');
          const kingdomId = idxKingdom !== -1 ? Number(row[idxKingdom] || 0) : 0;
          const power = idxPower !== -1 ? Number(row[idxPower] || 0) : 0;
          const alignment = idxAlignment !== -1 ? Number(row[idxAlignment] || 0) : 0;
          const lastLogout = idxLastLogout !== -1 ? Number(row[idxLastLogout] || 0) : 0;
          
          let kingdomName = 'Libre / Colon';
          if (kingdomId === 1) kingdomName = 'Jenn-Kellon';
          else if (kingdomId === 2) kingdomName = 'Horde of the Summoned';
          else if (kingdomId === 3) kingdomName = 'Libila';
          
          let title = 'Colon de Wurm';
          if (power >= 5) title = 'Administrateur suprême (GM)';
          else if (power >= 2) title = 'Maître de Jeu (GM)';
          else if (alignment >= 80) title = 'Dévot Céleste de Fo';
          else if (alignment <= -80) title = 'Serviteur du Chaos';
          
          // Generate realistic layout scatter coordinates
          const x = 25 + Math.random() * 50;
          const y = 25 + Math.random() * 50;
          const avatar = power >= 2 ? '👑' : (alignment >= 80 ? '🧙‍♂️' : (alignment <= -80 ? '💀' : '🧑‍🌾'));
          
          players.push({
            id,
            name,
            title,
            alignment,
            village: kingdomName,
            specialty: power >= 2 ? 'Administration' : 'Exploration',
            level: Math.round(35 + Math.random() * 55),
            x: Number(x.toFixed(2)),
            y: Number(y.toFixed(2)),
            status: 'active',
            avatar,
            lastLogout: lastLogout > 0 ? new Date(lastLogout * 1000).toLocaleString() : 'Inconnue'
          });
        }
      }
      result.players = players;
    }
  } catch (err) {
    console.error('Error parsing SQLite data:', err);
  } finally {
    db.close();
  }
  
  return result;
}

const DEFAULT_DB = {
  global: {
    type: "portal",
    indexMainTitle: "QBC Multigaming",
    indexMainTitle_fr: "PORTAIL SERVEUR QBC",
    indexMainTitle_en: "QBC PORTAL",
    indexSubTitle: "Portail d'Accès aux Instances Réseau",
    indexSubTitle_fr: "ACCÈS RÉSEAU UNIFIÉ",
    indexSubTitle_en: "UNIFIED NETWORK ACCESS",
    title: "Bienvenue sur le Réseau QBC",
    desc: "Bienvenue sur le Cockpit Officiel de QBC. Tout le réseau est opérationnel. Bon jeu à tous !",
    desc_en: "Welcome to the Official QBC Cockpit. The entire network is online. Have fun!",
    warn: "🚨 PORTAIL DE HAUTE DISPONIBILITÉ EN LIGNE v88.0",
    global_badge: "🚨 ",
    global_warn_text: "PORTAIL DE HAUTE DISPONIBILITÉ EN LIGNE v88.0",
    portalTheme: "standard",
    securityNoCopy: "false"
  },
  wurm1: {
    id: "wurm1",
    type: "wurm",
    game_icon: "👑 ",
    name: "Doriath (Monde Principal)",
    name_fr: "Doriath (Monde Principal)",
    name_en: "Doriath (Main World)",
    ip: "104.243.40.52:5134",
    rb: "Tous les lundis à 04:00 AM",
    badge_state: "stable",
    wn_text: "Live Map opérationnelle !",
    status: "online",
    slots: "12/40",
    votes: "45"
  },
  wurm2: {
    id: "wurm2",
    type: "wurm",
    game_icon: "👑 ",
    name: "Wurm Server 2",
    name_fr: "Wurm Server 2",
    name_en: "Wurm Server 2",
    ip: "74.50.94.238:5610",
    rb: "Chaque jour à 06:00 AM",
    badge_state: "stable",
    wn_text: "Update mineur installé",
    status: "online",
    slots: "3/250",
    votes: "10"
  },
  "7dtd1": {
    id: "7dtd1",
    type: "7dtd",
    game_icon: "🧟 ",
    name: "7 Days to Die Vanilla",
    name_fr: "7 Days to Die Vanilla",
    name_en: "7 Days to Die Vanilla",
    ip: "15.235.65.131:25593",
    rb: "Redémarrage quotidien",
    badge_state: "stable",
    wn_text: "Monde survivant",
    status: "online",
    slots: "4/16",
    votes: "5"
  },
  "7dtd2": {
    id: "7dtd2",
    type: "7dtd",
    game_icon: "💀 ",
    name: "7 Days to Die Moddé",
    name_fr: "7 Days to Die Moddé",
    name_en: "7 Days to Die Modded",
    ip: "51.222.244.134:25592",
    rb: "Mardi matin",
    badge_state: "stable",
    wn_text: "Zombies agressifs !",
    status: "online",
    slots: "0/20",
    votes: "12"
  },
  avo1: {
    id: "avo1",
    type: "avorion",
    game_icon: "🚀 ",
    name: "Avorion Space Core",
    name_fr: "Avorion Space Core",
    name_en: "Avorion Space Core",
    ip: "15.235.65.131:25598",
    rb: "Tous les matins",
    badge_state: "stable",
    wn_text: "Exploration galactique",
    status: "online",
    slots: "8/50",
    votes: "22"
  },
  avo2: {
    id: "avo2",
    type: "avorion",
    game_icon: "🌌 ",
    name: "Avorion Sector Beta",
    name_fr: "Avorion Sector Beta",
    name_en: "Avorion Sector Beta",
    ip: "51.222.244.134:25605",
    rb: "Manuel",
    badge_state: "maintenance",
    wn_text: "En cours de maintenance",
    status: "offline",
    slots: "0/50",
    votes: "3"
  }
};

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading DB file, using default DB:', err);
  }
  return DEFAULT_DB;
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

// Global cache for live status query results
const liveCache: Record<string, { slots: string; status: 'online' | 'offline' }> = {};

interface QueryResult {
  players: number;
  max: number;
  name: string;
}

// Queries a game server using the Steam/Source A2S_INFO query protocol (UDP)
function queryA2S(ip: string, port: number, timeout = 1200): Promise<QueryResult> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    
    // Standard A2S_INFO Request Payload
    const packet = Buffer.from([
      0xFF, 0xFF, 0xFF, 0xFF, // Header
      0x54,                   // A2S_INFO identifier
      0x53, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45, 0x6e, 0x67, 0x69, 0x6e, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00 // "Source Engine Query\0"
    ]);

    let timer = setTimeout(() => {
      client.close();
      reject(new Error('Query timeout'));
    }, timeout);

    client.on('error', (err) => {
      clearTimeout(timer);
      client.close();
      reject(err);
    });

    client.on('message', (msg) => {
      clearTimeout(timer);
      client.close();
      
      try {
        if (msg.length < 5) {
          return reject(new Error('Response too short'));
        }
        
        // Response header must be 0xFFFFFFFF
        if (msg.readInt32LE(0) !== -1) {
          return reject(new Error('Invalid response header'));
        }
        
        const type = msg.readUInt8(4);
        
        // 0x49 ('I') is standard A2S_INFO reply
        if (type === 0x49) {
          let offset = 5;
          
          if (offset + 1 > msg.length) return reject(new Error('Message truncated'));
          const protocol = msg.readUInt8(offset);
          offset += 1;
          
          const readString = () => {
            let end = offset;
            while (end < msg.length && msg[end] !== 0) {
              end++;
            }
            const s = msg.toString('utf8', offset, end);
            offset = end + 1;
            return s;
          };
          
          const name = readString();
          const map = readString();
          const folder = readString();
          const game = readString();
          
          if (offset + 5 > msg.length) {
            return reject(new Error('Message details truncated'));
          }
          
          const id = msg.readUInt16LE(offset);
          offset += 2;
          
          const players = msg.readUInt8(offset);
          offset += 1;
          
          const max = msg.readUInt8(offset);
          offset += 1;
          
          resolve({ players, max, name });
        } 
        // 0x41 ('A') is Steam Challenge number redirect (e.g. required by newer servers / Wurm Unlimited)
        else if (type === 0x41) {
          if (msg.length >= 9) {
            const challenge = msg.slice(5, 9);
            // Append challenge bytes to the end of original A2S_INFO query request
            const challengePacket = Buffer.concat([packet, challenge]);
            
            const retryClient = dgram.createSocket('udp4');
            let retryTimer = setTimeout(() => {
              retryClient.close();
              reject(new Error('Challenge response timeout'));
            }, timeout);
            
            retryClient.on('message', (retryMsg) => {
              clearTimeout(retryTimer);
              retryClient.close();
              
              try {
                if (retryMsg.length < 5 || retryMsg.readInt32LE(0) !== -1) {
                  return reject(new Error('Invalid retry challenge header'));
                }
                const rType = retryMsg.readUInt8(4);
                if (rType === 0x49) {
                  let rOffset = 5;
                  rOffset += 1; // skip protocol
                  
                  const rReadString = () => {
                    let end = rOffset;
                    while (end < retryMsg.length && retryMsg[end] !== 0) {
                      end++;
                    }
                    const s = retryMsg.toString('utf8', rOffset, end);
                    rOffset = end + 1;
                    return s;
                  };
                  
                  const rName = rReadString();
                  const rMap = rReadString();
                  const rFolder = rReadString();
                  const rGame = rReadString();
                  
                  if (rOffset + 5 > retryMsg.length) {
                    return reject(new Error('Challenge reply details truncated'));
                  }
                  
                  const rId = retryMsg.readUInt16LE(rOffset);
                  rOffset += 2;
                  
                  const rPlayers = retryMsg.readUInt8(rOffset);
                  rOffset += 1;
                  
                  const rMax = retryMsg.readUInt8(rOffset);
                  
                  resolve({ players: rPlayers, max: rMax, name: rName });
                } else {
                  reject(new Error(`Unexpected response code after challenge: ${rType}`));
                }
              } catch (e) {
                reject(e);
              }
            });
            
            retryClient.on('error', (err) => {
              clearTimeout(retryTimer);
              retryClient.close();
              reject(err);
            });
            
            retryClient.send(challengePacket, 0, challengePacket.length, port, ip);
          } else {
            reject(new Error('Invalid challenge redirect buffer size'));
          }
        } else {
          reject(new Error(`Unknown Steam response header: ${type}`));
        }
      } catch (err) {
        reject(err);
      }
    });

    client.send(packet, 0, packet.length, port, ip);
  });
}

interface A2SPlayer {
  name: string;
  score: number;
  timePlayed: number;
}

function queryA2SPlayers(ip: string, port: number, timeout = 1200): Promise<A2SPlayer[]> {
  return new Promise((resolve, reject) => {
    const client = dgram.createSocket('udp4');
    
    const initPacket = Buffer.from([
      0xFF, 0xFF, 0xFF, 0xFF,
      0x55,
      0xFF, 0xFF, 0xFF, 0xFF
    ]);
    
    let timer = setTimeout(() => {
      client.close();
      reject(new Error('Query players timeout'));
    }, timeout);
    
    client.on('error', (err) => {
      clearTimeout(timer);
      client.close();
      reject(err);
    });
    
    client.on('message', (msg) => {
      try {
        if (msg.length < 5) {
          clearTimeout(timer);
          client.close();
          return reject(new Error('Response too short'));
        }
        
        if (msg.readInt32LE(0) !== -1) {
          clearTimeout(timer);
          client.close();
          return reject(new Error('Invalid response header'));
        }
        
        const type = msg.readUInt8(4);
        
        if (type === 0x44) {
          clearTimeout(timer);
          client.close();
          const players = parseA2SPlayersResponse(msg);
          return resolve(players);
        }
        
        if (type === 0x41) {
          if (msg.length < 9) {
            clearTimeout(timer);
            client.close();
            return reject(new Error('Challenge response too short'));
          }
          
          const challenge = msg.slice(5, 9);
          const secondPacket = Buffer.concat([
            Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x55]),
            challenge
          ]);
          
          const retryClient = dgram.createSocket('udp4');
          let retryTimer = setTimeout(() => {
            retryClient.close();
            clearTimeout(timer);
            client.close();
            reject(new Error('Challenge players timeout'));
          }, timeout);
          
          retryClient.on('error', (err) => {
            clearTimeout(retryTimer);
            retryClient.close();
            clearTimeout(timer);
            client.close();
            reject(err);
          });
          
          retryClient.on('message', (retryMsg) => {
            clearTimeout(retryTimer);
            retryClient.close();
            clearTimeout(timer);
            client.close();
            
            try {
              if (retryMsg.length < 5 || retryMsg.readInt32LE(0) !== -1) {
                return reject(new Error('Invalid response header from challenge players'));
              }
              const rType = retryMsg.readUInt8(4);
              if (rType === 0x44) {
                const players = parseA2SPlayersResponse(retryMsg);
                resolve(players);
              } else {
                reject(new Error(`Unexpected players response header type: ${rType}`));
              }
            } catch (e) {
              reject(e);
            }
          });
          
          retryClient.send(secondPacket, 0, secondPacket.length, port, ip);
        } else {
          clearTimeout(timer);
          client.close();
          reject(new Error(`Unexpected response type: ${type}`));
        }
      } catch (err) {
        clearTimeout(timer);
        client.close();
        reject(err);
      }
    });
    
    client.send(initPacket, 0, initPacket.length, port, ip);
  });
}

function parseA2SPlayersResponse(msg: Buffer): A2SPlayer[] {
  const players: A2SPlayer[] = [];
  if (msg.length < 6) return players;
  
  const count = msg.readUInt8(5);
  let offset = 6;
  
  for (let i = 0; i < count; i++) {
    if (offset + 1 > msg.length) break;
    const index = msg.readUInt8(offset);
    offset += 1;
    
    let end = offset;
    while (end < msg.length && msg[end] !== 0) {
      end++;
    }
    const name = msg.toString('utf8', offset, end);
    offset = end + 1;
    
    if (offset + 8 > msg.length) break;
    const score = msg.readInt32LE(offset);
    offset += 4;
    
    const timePlayed = msg.readFloatLE(offset);
    offset += 4;
    
    if (name && name.trim()) {
      players.push({ name, score, timePlayed });
    }
  }
  
  return players;
}

// Scans individual server checking standard ports and port+1 fallback patterns
async function scanServer(id: string, srv: any, db: any) {
  const ipStr = srv.ip || '';
  const defaultSlots = srv.slots || '0/20';
  let querySuccess = false;

  // 1. Try Telnet first if configured
  if (srv.telnetHost && srv.telnetPort) {
    try {
      console.log(`[Background Scanner] Querying ${id} via Telnet at ${srv.telnetHost}:${srv.telnetPort}`);
      const tPort = parseInt(srv.telnetPort, 10);
      const output = await executeTelnetCommand(srv.telnetHost, tPort, srv.telnetPassword, 'listplayers');
      const telnetPlayers = parse7DaysPlayers(output);
      
      const activeCount = telnetPlayers.length;
      const maxSlots = defaultSlots ? (defaultSlots.split('/')[1] || '20') : '20';
      
      liveCache[id] = {
        slots: `${activeCount}/${maxSlots}`,
        status: 'online'
      };
      querySuccess = true;
      console.log(`[Background Scanner] Telnet scan succeeded for ${id}, found ${activeCount} players.`);

      // Also get in-game Day/time
      try {
        const timeOutput = await executeTelnetCommand(srv.telnetHost, tPort, srv.telnetPassword, 'gettime');
        const dayMatch = timeOutput.match(/Day\s+(\d+)/i);
        if (dayMatch) {
          const matchedDay = parseInt(dayMatch[1], 10);
          if (!isNaN(matchedDay) && matchedDay > 0) {
            if (srv.worldDay !== matchedDay) {
              console.log(`[Background Scanner] Auto-synced Day for ${id} from ${srv.worldDay} to ${matchedDay}`);
              srv.worldDay = matchedDay;
              writeDb(db);
            }
          }
        }
      } catch (timeErr: any) {
        console.warn(`[Background Scanner] Background Day sync failed for ${id}: ${timeErr.message}`);
      }

    } catch (telnetErr: any) {
      console.warn(`[Background Scanner] Prioritized Telnet scan failed for ${id}: ${telnetErr.message}. Will try Steam A2S query fallback...`);
    }
  }

  // 2. Try Steam A2S Query if Telnet wasn't run or failed
  if (!querySuccess) {
    const parts = ipStr.split(':');
    if (parts.length === 2) {
      const host = parts[0];
      const basePort = parseInt(parts[1], 10);
      if (!isNaN(basePort)) {
        const candidatePorts = [basePort, basePort + 1];
        
        for (const qPort of candidatePorts) {
          try {
            const res = await queryA2S(host, qPort, 1200);
            liveCache[id] = {
              slots: `${res.players}/${res.max}`,
              status: 'online'
            };
            querySuccess = true;
            console.log(`[Background Scanner] Steam A2S scan succeeded for ${id} on port ${qPort}, found ${res.players} players.`);
            break;
          } catch (err) {
            // Loop continues
          }
        }
      }
    }
  }

  // 3. Fallback to offline if neither succeeded
  if (!querySuccess) {
    liveCache[id] = {
      slots: defaultSlots,
      status: 'offline'
    };
  }
}

// Version corrigée pour éviter le blocage réseau (Exit Code 254)
async function runBackgroundScanner() {
  try {
    const db = readDb();
    const keys = Object.keys(db).filter(key => key !== 'global');
    
    console.log(`🔍 Démarrage du scan séquentiel de ${keys.length} serveurs...`);
    
    // On remplace Promise.allSettled par une boucle qui attend la fin de chaque serveur
    for (const key of keys) {
      try {
        const srv = db[key];
        console.log(`📡 Connexion et scan du serveur : ${key}...`);
        
        // On attend que ce serveur soit complètement fini avant de passer au suivant
        await scanServer(key, srv, db);
        
        // Petite pause de sécurité d'une seconde pour laisser respirer le pare-feu de Legion
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (srvErr) {
        console.error(`❌ Erreur lors du scan du serveur ${key}:`, srvErr);
      }
    }
    
    console.log('🏁 Tous les serveurs ont été scannés proprement un par un.');
  } catch (err) {
    console.error('Error running scanner background task:', err);
  }
}


// Start periodic scanner loop
setInterval(runBackgroundScanner, 20000);
setTimeout(runBackgroundScanner, 1500);

function executeTelnetCommand(host: string, port: number, password?: string, command: string = 'listplayers'): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let output = '';
    let passwordSent = false;
    let commandSent = false;
    
    // Safety timeout for the entire operation (extended to 12 seconds for slow connections)
    let safetyTimer = setTimeout(() => {
      socket.destroy();
      reject(new Error('Telnet connection timeout (12s)'));
    }, 12000);

    // Debounce timer for silence detection
    let silenceTimer: NodeJS.Timeout | null = null;

    // Connect-level timeout/delay
    let connectTimer: NodeJS.Timeout | null = null;

    // Helper to handle Telnet IAC negotiation
    function handleTelnetNegotiation(chunk: Buffer): Buffer {
      const cleanBytes: number[] = [];
      let i = 0;
      while (i < chunk.length) {
        if (chunk[i] === 255) { // IAC
          if (i + 1 < chunk.length) {
            const cmd = chunk[i + 1];
            // 251: WILL, 252: WONT, 253: DO, 254: DONT
            if (cmd === 251 || cmd === 252 || cmd === 253 || cmd === 254) {
              if (i + 2 < chunk.length) {
                const option = chunk[i + 2];
                // If the server sends DO (253), we reply with WONT (252) to refuse
                if (cmd === 253) {
                  socket.write(Buffer.from([255, 252, option]));
                }
                // If the server sends WILL (251), we reply with DONT (254) to refuse
                else if (cmd === 251) {
                  socket.write(Buffer.from([255, 254, option]));
                }
                i += 3;
                continue;
              }
            } else if (cmd === 240 || cmd === 250) {
              // Subnegotiation or other multi-byte command, skip safely
              i += 2;
              continue;
            } else {
              i += 2;
              continue;
            }
          }
        }
        cleanBytes.push(chunk[i]);
        i++;
      }
      return Buffer.from(cleanBytes);
    }

    socket.connect(port, host, () => {
      console.log(`[Telnet] Connected to ${host}:${port}. Initiating session...`);
      
      // Fallback: if no password prompt is detected after 2.5s
      connectTimer = setTimeout(() => {
        if (!passwordSent && password) {
          console.log(`[Telnet] No password prompt detected after 2.5s. Sending password anyway.`);
          socket.write(`${password}\r\n`);
          passwordSent = true;
          
          // Wait another 800ms before sending the command
          setTimeout(() => {
            if (!commandSent) {
              console.log(`[Telnet] Post-password delay complete. Sending command: ${command}`);
              socket.write(`${command}\r\n`);
              commandSent = true;
              output = '';
            }
          }, 800);
        } else if (!commandSent) {
          console.log(`[Telnet] No password prompt detected after 2.5s. Sending command directly: ${command}`);
          socket.write(`${command}\r\n`);
          commandSent = true;
          output = '';
        }
      }, 2500);
    });

    socket.on('data', (data) => {
      // Handle IAC options and strip them
      const cleanData = handleTelnetNegotiation(data);
      const chunk = cleanData.toString('utf8');
      output += chunk;

      const lowerOut = output.toLowerCase();

      // Check if server is prompting for password (flexible check matching with/without colon or spacing)
      const hasPasswordPrompt = lowerOut.includes('password') || 
                                 lowerOut.includes('passwort') || 
                                 lowerOut.includes('pass:') || 
                                 lowerOut.includes('enter pass');

      if (hasPasswordPrompt && !passwordSent) {
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        if (password) {
          console.log(`[Telnet] Password prompt detected. Sending password.`);
          socket.write(`${password}\r\n`);
          passwordSent = true;
          output = ''; // clear output buffer containing password prompt
          
          // Once password is written, send the command after 800ms (to let login complete safely)
          setTimeout(() => {
            if (!commandSent) {
              console.log(`[Telnet] Post-password delay complete. Sending command: ${command}`);
              socket.write(`${command}\r\n`);
              commandSent = true;
              output = '';
            }
          }, 800);
        } else {
          socket.destroy();
          clearTimeout(safetyTimer);
          if (connectTimer) clearTimeout(connectTimer);
          if (silenceTimer) clearTimeout(silenceTimer);
          reject(new Error('Password required by server'));
          return;
        }
      } 
      // If password was already sent, or if the server greeted us and showed a prompt, we can also send the command immediately
      else if (passwordSent && !commandSent) {
        const hasLogonConfirmation = lowerOut.includes('successful') || 
                                     lowerOut.includes('logon') || 
                                     lowerOut.includes('session') || 
                                     lowerOut.includes('welcome') || 
                                     lowerOut.includes('***') || 
                                     lowerOut.includes('logged') ||
                                     lowerOut.includes('press enter') ||
                                     lowerOut.includes('connected') ||
                                     lowerOut.includes('logged in') ||
                                     lowerOut.includes('authenticated');
        if (hasLogonConfirmation) {
          console.log(`[Telnet] Logon confirmation detected. Sending command immediately: ${command}`);
          socket.write(`${command}\r\n`);
          commandSent = true;
          output = '';
        }
      }

      // Once the command is sent, we wait for a brief period of silence to ensure we have all response lines
      if (commandSent) {
        clearTimeout(safetyTimer); // Clear safety timeout since we got data
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        // Silence debounce of 800ms (keeps gathering packets until 800ms of silence)
        silenceTimer = setTimeout(() => {
          socket.destroy();
          resolve(output);
        }, 800);
      }
    });

    socket.on('error', (err) => {
      clearTimeout(safetyTimer);
      if (connectTimer) clearTimeout(connectTimer);
      if (silenceTimer) clearTimeout(silenceTimer);
      socket.destroy();
      reject(err);
    });

    socket.on('close', () => {
      clearTimeout(safetyTimer);
      if (connectTimer) clearTimeout(connectTimer);
      if (silenceTimer) clearTimeout(silenceTimer);
      resolve(output);
    });
  });
}

function parse7DaysPlayers(telnetOutput: string) {
  const lines = telnetOutput.split(/\r?\n/);
  const players: any[] = [];
  
  for (const line of lines) {
    // Check if the line has an ID or entity ID (using word boundaries to avoid matching platformid)
    let idMatch = line.match(/\b(?:id|entityid)\b\s*[=:]\s*["']?([a-zA-Z0-9_\-]+)["']?/i);
    if (!idMatch) {
      // Secondary fallback to platformid/steamid/userid if no entityid is found
      idMatch = line.match(/\b(?:platformid|steamid|userid|playid)\b\s*[=:]\s*["']?([a-zA-Z0-9_\-]+)["']?/i);
    }
    
    if (idMatch) {
      try {
        const id = idMatch[1];
        
        // Try parsing name via standard "name=" or "name:"
        let nameMatch = line.match(/\b(?:name|playername)\b\s*[=:]\s*(?:"([^"]+)"|'([^']+)'|([^,]+))/i);
        let name = '';
        
        if (nameMatch) {
          name = (nameMatch[1] || nameMatch[2] || nameMatch[3] || '').trim();
        } else {
          // Fallback 1: Split by comma and check if the second field is a raw value (doesn't contain '=' and isn't just whitespace)
          const parts = line.split(',').map(p => p.trim());
          if (parts.length > 1 && !parts[1].includes('=')) {
            // Strip any surrounding quotes if present
            name = parts[1].replace(/^["']|["']$/g, '').trim();
          }
          
          // Fallback 2: search for first quoted string in the line which might be the name
          if (!name) {
            const quotedMatch = line.match(/"([^"]+)"|'([^']+)'/);
            if (quotedMatch) {
              name = (quotedMatch[1] || quotedMatch[2] || '').trim();
            }
          }
          
          // Fallback 3: search for words in the line that look like a name
          // e.g. for "1. PlayerName, id=171" (but ignore "id" if that's what it matches!)
          if (!name) {
            const wordMatch = line.match(/^\d+\.\s+([a-zA-Z0-9_\-]+)/);
            if (wordMatch && wordMatch[1].toLowerCase() !== 'id') {
              name = wordMatch[1].trim();
            }
          }
          
          // Fallback 4: use ID as name prefix
          if (!name) {
            name = `Survivor-${id}`;
          }
        }
        
        // Skip system log lines that might match id/name by accident
        if (line.includes('INF') && !line.includes('player') && name.startsWith('Survivor-')) {
          continue; 
        }

        const posMatch = line.match(/(?:position|pos)\s*[=:]\s*\(([^)]+)\)/i);
        const healthMatch = line.match(/health\s*[=:]\s*["']?(\d+)["']?/i);
        const deathsMatch = line.match(/deaths\s*[=:]\s*["']?(\d+)["']?/i);
        const scoreMatch = line.match(/(?:score|kills|score_kills)\s*[=:]\s*["']?(\d+)["']?/i);
        const pingMatch = line.match(/ping\s*[=:]\s*["']?(\d+)["']?/i);
        const steamIdMatch = line.match(/\b(?:steamid|platformid|userid|playid)\b\s*[=:]\s*["']?([a-zA-Z0-9_\:\-]+)["']?/i);
        
        const health = healthMatch ? parseInt(healthMatch[1], 10) : 100;
        const deaths = deathsMatch ? parseInt(deathsMatch[1], 10) : 0;
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
        const ping = pingMatch ? parseInt(pingMatch[1], 10) : 0;
        const steamId = steamIdMatch ? steamIdMatch[1] : '';
        
        let x = 0;
        let y = 0;
        let z = 0;
        if (posMatch) {
          const coords = posMatch[1].split(',').map(c => parseFloat(c.trim()));
          if (coords.length >= 3) {
            x = coords[0];
            y = coords[1]; // height
            z = coords[2]; // Z
          }
        }
        
        players.push({
          id,
          name,
          health,
          deaths,
          score,
          ping,
          steamId,
          coordinates: { x, y, z },
          rawLine: line
        });
      } catch (e) {
        console.warn('Error parsing 7dtd player line:', line, e);
      }
    }
  }
  return players;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '60mb' }));

  // API Routes
  app.get('/api/config', (req, res) => {
    const db = readDb();
    // Inject real-time scanned slots and state
    for (const key of Object.keys(db)) {
      if (key !== 'global' && liveCache[key]) {
        db[key].slots = liveCache[key].slots;
        // Only set online if we successfully scanned, otherwise use the database's value
        if (liveCache[key].status === 'online') {
          db[key].status = 'online';
        }
      }
    }
    res.json(db);
  });

  app.get('/api/server-players/:serverId', async (req, res) => {
    const { serverId } = req.params;
    const db = readDb();
    const serverInfo = db[serverId];
    if (!serverInfo || !serverInfo.ip) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Attempt Telnet query first if configured on the server
    if (serverInfo.telnetHost && serverInfo.telnetPort) {
      try {
        console.log(`[Telnet server-query] Querying player list for ${serverId} via Telnet at ${serverInfo.telnetHost}:${serverInfo.telnetPort}`);
        const telnetPortNum = parseInt(serverInfo.telnetPort, 10);
        const output = await executeTelnetCommand(serverInfo.telnetHost, telnetPortNum, serverInfo.telnetPassword, 'listplayers');
        const telnetPlayers = parse7DaysPlayers(output);

        // Also update worldDay if we can fetch it via Telnet gettime
        let currentDay = serverInfo.worldDay || 1;
        try {
          const timeOutput = await executeTelnetCommand(serverInfo.telnetHost, telnetPortNum, serverInfo.telnetPassword, 'gettime');
          const dayMatch = timeOutput.match(/Day\s+(\d+)/i);
          if (dayMatch) {
            const matchedDay = parseInt(dayMatch[1], 10);
            if (!isNaN(matchedDay) && matchedDay > 0) {
              currentDay = matchedDay;
              if (serverInfo.worldDay !== matchedDay) {
                serverInfo.worldDay = matchedDay;
                writeDb(db);
              }
            }
          }
        } catch (timeErr: any) {
          console.warn(`[Telnet server-query] Failed to fetch exact time for ${serverId}: ${timeErr.message}`);
        }

        return res.json({ 
          status: 'success', 
          source: 'telnet', 
          players: telnetPlayers, 
          worldDay: currentDay 
        });
      } catch (telnetErr: any) {
        console.warn(`[Telnet server-query] Backend Telnet failed for ${serverId}: ${telnetErr.message}. Falling back to Steam query.`);
      }
    }

    const parts = serverInfo.ip.split(':');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    const host = parts[0];
    const basePort = parseInt(parts[1], 10);
    if (isNaN(basePort)) {
      return res.status(400).json({ error: 'Invalid port' });
    }

    const candidatePorts = [basePort, basePort + 1];
    for (const qPort of candidatePorts) {
      try {
        console.log(`[Steam Query] Querying player list for ${serverId} on ${host}:${qPort}`);
        const players = await queryA2SPlayers(host, qPort, 1200);
        return res.json({ status: 'success', source: 'steam', players, worldDay: serverInfo.worldDay });
      } catch (err: any) {
        console.warn(`[Steam Query] Query failed on port ${qPort}: ${err.message}`);
      }
    }

    res.json({ status: 'offline', players: [], worldDay: serverInfo.worldDay });
  });

  app.post('/api/server-players/:serverId/telnet-config', (req, res) => {
    const { serverId } = req.params;
    const { telnetHost, telnetPort, telnetPassword } = req.body;
    
    const db = readDb();
    if (!db[serverId]) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    db[serverId].telnetHost = telnetHost || '';
    db[serverId].telnetPort = telnetPort || '';
    db[serverId].telnetPassword = telnetPassword || '';
    
    writeDb(db);
    res.json({ status: 'success', message: 'Telnet configuration saved to server DB successfully.' });
  });

  app.post('/api/telnet/command', async (req, res) => {
    const { host, port, password, command } = req.body;
    if (!host || !port) {
      return res.status(400).json({ error: 'Missing host or port' });
    }
    const numericPort = parseInt(port, 10);
    if (isNaN(numericPort)) {
      return res.status(400).json({ error: 'Invalid port' });
    }

    try {
      console.log(`[Telnet command] Executing "${command}" on ${host}:${numericPort}`);
      const output = await executeTelnetCommand(host, numericPort, password, command);
      res.json({ status: 'success', output });
    } catch (err: any) {
      console.warn(`[Telnet command] Error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Telnet execution error' });
    }
  });

  app.post('/api/telnet/players', async (req, res) => {
    const { host, port, password } = req.body;
    if (!host || !port) {
      return res.status(400).json({ error: 'Missing host or port' });
    }
    const numericPort = parseInt(port, 10);
    if (isNaN(numericPort)) {
      return res.status(400).json({ error: 'Invalid port' });
    }

    try {
      console.log(`[Telnet players] Fetching listplayers for ${host}:${numericPort}`);
      const output = await executeTelnetCommand(host, numericPort, password, 'listplayers');
      const players = parse7DaysPlayers(output);
      res.json({ status: 'success', players, raw: output });
    } catch (err: any) {
      console.warn(`[Telnet players] Error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Telnet execution error' });
    }
  });

  app.post('/api/config', (req, res) => {
    const { key, config } = req.body;
    if (key !== SECRET_KEY_MASTER) {
      return res.status(401).json({ error: 'Unauthorized: Invalid administrative password key' });
    }
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Bad Request: Missing config object' });
    }
    writeDb(config);
    res.json({ status: 'success', config });
  });

  // Get currently extracted SQLite data
  app.get('/api/sqlite/data', (req, res) => {
    const data = readSqliteData();
    res.json(data);
  });

  // Serve map image downloaded via SFTP for a specific server
  app.get('/api/map-image/:serverId', (req, res) => {
    const { serverId } = req.params;
    const filePath = path.join(process.cwd(), `qbc_map_${serverId}.png`);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'image/png');
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.status(404).send('Not Found');
    }
  });

// Incrément des créatures tuées - Version compatible Vercel + GitHub
app.post('/api/sqlite/increment-kills', async (req, res) => {
  try {
    // 1. On récupère la valeur actuelle (qui est lue correctement depuis le JSON statique)
    const currentData = readSqliteData();
    const amount = req.body.amount || 1;
    const newTotalKills = (currentData.totalKills || 1438) + amount;

    console.log(`🤖 Demande de mise à jour des kills reçue. Nouveau total : ${newTotalKills}`);

    // 2. Déclenchement automatique d'un signal vers GitHub Actions (Repository Dispatch)
    // Cela va réveiller GitHub pour qu'il mette à jour le fichier proprement
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
      await fetch(`https://github.com{process.env.GITHUB_REPOSITORY}/dispatches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Vurm-Livemap-Server'
        },
        body: JSON.stringify({
          event_type: 'increment_kills_event',
          client_payload: { amount: amount }
        })
      });
    }

    // On renvoie une réponse positive immédiate à l'utilisateur sur la carte
    res.json({ status: 'success', totalKills: newTotalKills, note: 'Mise à jour GitHub planifiée' });
  } catch (err: any) {
    console.error('Erreur increment-kills:', err.message);
    res.status(500).json({ error: err.message });
  }
});


  // SFTP 7 Days to Die Map Download endpoint
  app.post('/api/7dtd/sftp-map', async (req, res) => {
    const { host, port, username, password, remotePath, fileName, serverId } = req.body;
    if (!host || !username || !password || !remotePath || !fileName) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : host, username, password, remotePath, fileName' });
    }

    const cleanHost = String(host).trim();
    const cleanUsername = String(username).trim();
    const cleanRemotePath = String(remotePath).trim();
    const cleanFileName = String(fileName).trim();
    const cleanPort = String(port || '').trim();
    const targetServerId = serverId || '7dtd1';

    const sftpConfig = {
      host: cleanHost,
      port: Number(cleanPort) || 22,
      username: cleanUsername,
      password: String(password),
      readyTimeout: 15000
    };

    console.log(`[SFTP-7DTD] Downloading map file ${cleanFileName} from ${cleanHost}:${sftpConfig.port} in ${cleanRemotePath}`);

    try {
      const finalRemotePath = cleanRemotePath.endsWith('/') ? cleanRemotePath : cleanRemotePath + '/';
      const remoteFilePath = `${finalRemotePath}${cleanFileName}`;

      const mapBuffer = await sftpDownloadToBuffer(sftpConfig, remoteFilePath);
      
      const mapOutPath = path.join(process.cwd(), `qbc_map_${targetServerId}.png`);
      fs.writeFileSync(mapOutPath, mapBuffer);
      console.log(`[SFTP-7DTD] Saved 7DTD map image locally to: ${mapOutPath} (${mapBuffer.length} bytes)`);

      res.json({
        status: 'success',
        message: 'Image de la carte téléchargée avec succès via SFTP.',
        imageUrl: `/api/map-image/${targetServerId}?t=${Date.now()}`
      });
    } catch (err: any) {
      console.error('[SFTP-7DTD] Map download error:', err);
      res.status(500).json({ error: `Échec du téléchargement SFTP de la carte : ${err.message}` });
    }
  });

  // SFTP Sync endpoint
  app.post('/api/sqlite/sftp-sync', async (req, res) => {
    const { host, port, username, password, remotePath, serverId } = req.body;
    if (!host || !username || !password || !remotePath) {
      return res.status(400).json({ error: 'Champs obligatoires manquants : host, username, password, remotePath' });
    }

    const cleanHost = String(host).trim();
    const cleanUsername = String(username).trim();
    const cleanRemotePath = String(remotePath).trim();
    const cleanPort = String(port || '').trim();

    const sftpConfig = {
      host: cleanHost,
      port: Number(cleanPort) || 22,
      username: cleanUsername,
      password: String(password),
      readyTimeout: 15000
    };

    console.log(`[SFTP] Initiating connection to ${cleanHost}:${sftpConfig.port} for path ${cleanRemotePath}`);

    try {
      const finalRemotePath = cleanRemotePath.endsWith('/') ? cleanRemotePath : cleanRemotePath + '/';
      
      let zonesBuffer: Buffer | null = null;
      let playersBuffer: Buffer | null = null;
      let errors: string[] = [];

      // Paths list to try for wurmzones.db
      const zonesPathsToTry = [
        `${finalRemotePath}wurmzones.db`,
        `${finalRemotePath}sqlite/wurmzones.db`
      ];

      // Try downloading wurmzones.db with fallbacks
      for (const zonesPath of zonesPathsToTry) {
        try {
          console.log(`[SFTP] Trying to download wurmzones.db from: ${zonesPath}...`);
          zonesBuffer = await sftpDownloadToBuffer(sftpConfig, zonesPath);
          console.log(`[SFTP] Downloaded wurmzones.db successfully from: ${zonesPath} (${zonesBuffer.length} bytes)`);
          break; // Found it!
        } catch (err: any) {
          console.warn(`[SFTP] Failed to download from ${zonesPath}:`, err.message);
          errors.push(`${zonesPath}: ${err.message}`);
        }
      }

      // Paths list to try for wurmplayers.db
      const playersPathsToTry = [
        `${finalRemotePath}wurmplayers.db`,
        `${finalRemotePath}sqlite/wurmplayers.db`
      ];

      // Try downloading wurmplayers.db with fallbacks
      for (const playersPath of playersPathsToTry) {
        try {
          console.log(`[SFTP] Trying to download wurmplayers.db from: ${playersPath}...`);
          playersBuffer = await sftpDownloadToBuffer(sftpConfig, playersPath);
          console.log(`[SFTP] Downloaded wurmplayers.db successfully from: ${playersPath} (${playersBuffer.length} bytes)`);
          break; // Found it!
        } catch (err: any) {
          console.warn(`[SFTP] Failed to download from ${playersPath}:`, err.message);
          errors.push(`${playersPath}: ${err.message}`);
        }
      }

      // Try downloading standard map files
      const mapFilesToTry = [
        'map.png',
        'map_flat.png',
        'map_topo.png',
        'map_dump.png',
        'dump.png',
        'flat.png',
        'map.jpg',
        'map_flat.jpg'
      ];
      let mapBuffer: Buffer | null = null;
      let mapFileNameUsed = '';

      for (const mapFile of mapFilesToTry) {
        const fullMapPath = `${finalRemotePath}${mapFile}`;
        try {
          console.log(`[SFTP] Trying to download map image from: ${fullMapPath}...`);
          mapBuffer = await sftpDownloadToBuffer(sftpConfig, fullMapPath);
          console.log(`[SFTP] Downloaded map image successfully from: ${fullMapPath} (${mapBuffer.length} bytes)`);
          mapFileNameUsed = mapFile;
          break;
        } catch (err: any) {
          // If map file in same path fails, try the parent path in case the DB is in a subfolder like sqlite/
          const parentRemotePath = finalRemotePath.endsWith('sqlite/') 
            ? finalRemotePath.substring(0, finalRemotePath.length - 7)
            : finalRemotePath;
          const altMapPath = `${parentRemotePath}${mapFile}`;
          if (altMapPath !== fullMapPath) {
            try {
              console.log(`[SFTP] Trying to download map image from alternative path: ${altMapPath}...`);
              mapBuffer = await sftpDownloadToBuffer(sftpConfig, altMapPath);
              console.log(`[SFTP] Downloaded map image successfully from alternative path: ${altMapPath} (${mapBuffer.length} bytes)`);
              mapFileNameUsed = mapFile;
              break;
            } catch (altErr: any) {
              // Ignore
            }
          }
        }
      }

      if (!zonesBuffer && !playersBuffer) {
        return res.status(404).json({
          error: `Fichiers non trouvés sur le serveur SFTP. Veuillez vérifier que les fichiers "wurmzones.db" ou "wurmplayers.db" se trouvent bien dans le dossier spécifié ou son sous-dossier "sqlite/".\n\nTentatives infructueuses :\n${errors.join('\n')}`
        });
      }

      const currentData = readSqliteData();
      let syncSummary: string[] = [];

      if (zonesBuffer) {
        const parsedZones = await parseSqliteFile(zonesBuffer, 'wurmzones.db');
        if (parsedZones.type === 'zones') {
          currentData.villages = parsedZones.villages;
          currentData.creatures = parsedZones.creatures || null;
          syncSummary.push(`${parsedZones.villages?.length} cadastres/villages et ${parsedZones.creatures?.length} créatures synchronisés`);
        }
      }

      if (playersBuffer) {
        const parsedPlayers = await parseSqliteFile(playersBuffer, 'wurmplayers.db');
        if (parsedPlayers.type === 'players') {
          currentData.players = parsedPlayers.players;
          syncSummary.push(`${parsedPlayers.players?.length} personnages synchronisés`);
        }
      }

      if (mapBuffer) {
        const targetServerId = serverId || 'wurm1';
        const mapOutPath = path.join(process.cwd(), `qbc_map_${targetServerId}.png`);
        fs.writeFileSync(mapOutPath, mapBuffer);
        console.log(`[SFTP] Saved map image locally to: ${mapOutPath}`);
        if (!currentData.hasMapImage) {
          currentData.hasMapImage = {};
        }
        currentData.hasMapImage[targetServerId] = true;
        syncSummary.push(`Carte d'origine (${mapFileNameUsed}) téléchargée`);
      }

      currentData.lastUpdated = new Date().toLocaleString();
      writeSqliteData(currentData);

      res.json({
        status: 'success',
        summary: syncSummary.join(' & '),
        warnings: errors.length > 0 ? errors : undefined,
        data: currentData
      });
    } catch (err: any) {
      console.error('[SFTP] Sync error:', err);
      res.status(500).json({ error: `Échec de connexion SFTP : ${err.message}` });
    }
  });

  // SFTP List directory endpoint
  app.post('/api/sqlite/sftp-list', async (req, res) => {
    const { host, port, username, password, remotePath } = req.body;
    if (!host || !username || !password) {
      return res.status(400).json({ error: 'Champs requis : host, username, password' });
    }

    const cleanHost = String(host).trim();
    const cleanUsername = String(username).trim();
    const cleanPort = String(port || '').trim();
    const cleanRemotePath = String(remotePath || '').trim();

    const sftpConfig = {
      host: cleanHost,
      port: Number(cleanPort) || 22,
      username: cleanUsername,
      password: String(password),
      readyTimeout: 15000
    };

    const targetPath = cleanRemotePath || '.';
    console.log(`[SFTP] Listing directory ${targetPath} on ${cleanHost}:${sftpConfig.port}`);

    try {
      const list = await sftpListDir(sftpConfig, targetPath);
      res.json({ status: 'success', path: targetPath, files: list });
    } catch (err: any) {
      console.error('[SFTP] List error:', err);
      res.status(500).json({ error: `Impossible de lister le dossier : ${err.message}` });
    }
  });

  // Upload and process a SQLite file (wurmzones.db or wurmplayers.db)
  app.post('/api/sqlite/upload', async (req, res) => {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      return res.status(400).json({ error: 'Missing filename or base64 data payload' });
    }

    try {
      const buffer = Buffer.from(base64, 'base64');
      console.log(`[SQLite] Processing uploaded file: ${filename} (${buffer.length} bytes)`);
      
      const parsed = await parseSqliteFile(buffer, filename);
      if (parsed.type === 'unknown') {
        return res.status(400).json({ 
          error: 'Le fichier ne semble pas être une base de données Wurm valide (table VILLAGES ou PLAYERS manquante dans SQLite)' 
        });
      }

      // Merge with existing extracted SQLite data
      const currentData = readSqliteData();
      
      if (parsed.type === 'zones') {
        currentData.villages = parsed.villages;
        currentData.creatures = parsed.creatures || null;
        console.log(`[SQLite] Extracted ${parsed.villages?.length} deeds/villages and ${parsed.creatures?.length} creature types successfully.`);
      } else if (parsed.type === 'players') {
        currentData.players = parsed.players;
        console.log(`[SQLite] Extracted ${parsed.players?.length} player records successfully.`);
      }

      currentData.lastUpdated = new Date().toLocaleString();
      writeSqliteData(currentData);

      res.json({
        status: 'success',
        type: parsed.type,
        count: parsed.type === 'zones' ? parsed.villages?.length : parsed.players?.length,
        data: currentData
      });
    } catch (err: any) {
      console.error('[SQLite] Upload parsing error:', err);
      res.status(500).json({ error: `Erreur interne lors de l'extraction: ${err.message}` });
    }
  });

  // Clear SQLite data
  app.post('/api/sqlite/clear', (req, res) => {
    try {
      if (fs.existsSync(SQLITE_DATA_FILE)) {
        fs.unlinkSync(SQLITE_DATA_FILE);
      }
      res.json({ status: 'success', data: { villages: null, players: null, creatures: null, totalKills: 1438, lastUpdated: null } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve static assets and/or Vite
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[QBC] Express server running on port ${PORT}`);
  });
}

startServer();
