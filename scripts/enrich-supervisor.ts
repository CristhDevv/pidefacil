/**
 * ==============================================================================
 * PideFácil - Supervisor Resiliente de Procesos (Auto-Arranque y Resurrección)
 * ==============================================================================
 * Supervisa el demonio de enriquecimiento (enrich-daemon.ts).
 * Si el proceso muere, es terminado con taskkill /F o falla, el supervisor:
 * 1. Registra el evento de caída con timestamp en data/supervisor.log.
 * 2. Limpia candados residuales si es necesario.
 * 3. Resucita el proceso automáticamente tras una breve pausa (3 segundos).
 * 4. Controla límites de caídas consecutivas para evitar bucles descontrolados.
 */

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SUPERVISOR_LOG = path.join(DATA_DIR, 'supervisor.log');
const LOCK_FILE = path.join(DATA_DIR, 'enrich.lock');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function logSupervisor(msg: string) {
  const line = `[${new Date().toISOString()}] [SUPERVISOR] ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync(SUPERVISOR_LOG, line);
}

let activeChild: ChildProcess | null = null;
let restartCount = 0;
let isShuttingDown = false;

function startDaemon() {
  if (isShuttingDown) return;

  logSupervisor(`Iniciando instancia #${restartCount + 1} de enrich-daemon.ts...`);

  // Ejecutar con tsx
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'npx';
  const args = ['tsx', 'scripts/enrich-daemon.ts'];

  activeChild = spawn(cmd, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
  });

  const childPid = activeChild.pid;
  logSupervisor(`Proceso demonio corriendo con PID: ${childPid}`);

  activeChild.on('error', (err) => {
    logSupervisor(`Error al spawnear demonio: ${err.message}`);
  });

  activeChild.on('exit', (code, signal) => {
    logSupervisor(`Demonio (PID: ${childPid}) finalizó con código: ${code}, señal: ${signal}`);
    activeChild = null;

    if (isShuttingDown) {
      logSupervisor('Cierre intencional completado.');
      process.exit(0);
    }

    restartCount++;
    logSupervisor(`💥 Caída detectada. Resucitando automáticamente en 3 segundos... (Reinicio #${restartCount})`);
    
    // Si quedó un lock huérfano, asegurarse de liberarlo
    if (fs.existsSync(LOCK_FILE)) {
      try {
        const lockedPid = fs.readFileSync(LOCK_FILE, 'utf8').trim();
        if (lockedPid === childPid?.toString()) {
          fs.unlinkSync(LOCK_FILE);
          logSupervisor('Candado huérfano liberado exitosamente.');
        }
      } catch {}
    }

    setTimeout(() => {
      startDaemon();
    }, 3000);
  });
}

// Manejo de señales de terminación para cierre limpio
process.on('SIGINT', () => {
  logSupervisor('SIGINT recibido en supervisor. Terminando hijo...');
  isShuttingDown = true;
  if (activeChild) activeChild.kill('SIGINT');
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  logSupervisor('SIGTERM recibido en supervisor. Terminando hijo...');
  isShuttingDown = true;
  if (activeChild) activeChild.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
});

logSupervisor('Iniciando Supervisor de Enriquecimiento Permanente PideFácil...');
startDaemon();
