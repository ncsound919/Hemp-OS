import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, Play, Database, ShieldCheck, Sparkles, Plus, Check, Info, 
  RefreshCw, Scale, Thermometer, Sliders, Activity, ShieldAlert, Boxes, Compass, 
  FileText, Clock, CheckCircle, AlertTriangle, AlertCircle, Settings, Laptop, Network, 
  Key, Layers, ArrowUp, ArrowDown, Search, Filter, Server, ChevronRight, HardDrive, 
  Fingerprint, Save, RotateCcw, Power, Zap, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

// Define structures for our Windows elements
interface WindowsService {
  name: string;
  displayName: string;
  status: 'Running' | 'Stopped' | 'Paused';
  cpu: number;
  memoryMb: number;
  pid: number;
  startupType: 'Automatic' | 'Manual' | 'Disabled';
  description: string;
}

interface EventLogEntry {
  id: number;
  level: 'Information' | 'Warning' | 'Error' | 'Success Audit';
  timestamp: string;
  source: string;
  category: string;
  eventId: number;
  message: string;
}

interface VssSnapshot {
  id: string;
  volume: string;
  timestamp: string;
  sizeGb: number;
  stateSnapshot: {
    biomassName: string;
    thc: number;
    cbd: number;
    cbg: number;
    activeStageId: string;
  };
}

interface WslDistro {
  name: string;
  status: 'Running' | 'Stopped';
  version: number;
  packages: { name: string; version: string; purpose: string }[];
}

interface WindowsIntegrationLayerProps {
  biomass: {
    name: string;
    mass: number;
    potency: { thca: number; thc: number; cbda: number; cbd: number; cbga: number; cbg: number; other: number };
  };
  setBiomass: React.Dispatch<React.SetStateAction<any>>;
  graph: {
    stages: { id: string; name: string; type: string; config: Record<string, any> }[];
  };
  setGraph: React.Dispatch<React.SetStateAction<any>>;
  activeStageId: string;
  setActiveStageId: (id: string) => void;
  runSimulation: () => void;
  accessToken: string | null;
}

export function WindowsIntegrationLayer({
  biomass,
  setBiomass,
  graph,
  setGraph,
  activeStageId,
  setActiveStageId,
  runSimulation,
  accessToken
}: WindowsIntegrationLayerProps) {
  
  // Tab within Windows Integration Layer
  const [winTab, setWinTab] = useState<'copilot' | 'services' | 'powershell' | 'wsl' | 'vss' | 'eventlog'>('copilot');

  // --- COPILOT INTERACTIVE CONSOLE ---
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotChat, setCopilotChat] = useState<{ sender: 'user' | 'copilot'; text: string; action?: { type: string; payload: any; label: string } }[]>([
    {
      sender: 'copilot',
      text: `Hello Tap4500! I am Microsoft Copilot, your **System‑Level Research Interface** to the Hemp OS Scientific Subsystem.\n\nI have scanned your active Windows host environments, your NTFS storage layers, and your mounted Google Drive corpus. How can I assist you with your deterministic research campaign today?\n\n*Suggestions of what you can ask me to execute:*\n1. "Optimize the decarboxylation calibration temperature to 125C in the active flowsheet"\n2. "Generate a complete NTFS VSS Snapshot of the current state for rollback purposes"\n3. "Check background service dependencies and verify the WSL2 SciPy environment"\n4. "Audit system telemetry logs for boundary violations in the thermodynamic solver"`
    }
  ]);
  const [isCopilotTyping, setIsCopilotTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [copilotChat, isCopilotTyping]);

  const handleCopilotSend = () => {
    if (!copilotInput.trim()) return;
    const userMsg = copilotInput.trim();
    setCopilotChat(prev => [...prev, { sender: 'user', text: userMsg }]);
    setCopilotInput('');
    setIsCopilotTyping(true);

    setTimeout(() => {
      let reply = '';
      let action: any = undefined;

      const norm = userMsg.toLowerCase();
      if (norm.includes('optimize') || norm.includes('temperature') || norm.includes('decarb') || norm.includes('calibrate')) {
        reply = `Analyzing thermodynamic requirements... I have calculated that a temperature calibration of **125°C** is optimal for the **Decarboxylation** stage under the current moisture level of ${biomass.name}.\n\nWould you like me to execute this calibration command to the live flowsheet stage parameters?`;
        action = {
          type: 'UPDATE_DECARB_TEMP',
          payload: { stageId: 'stage-decarb', temp: 125 },
          label: 'Calibrate Decarb to 125°C'
        };
      } else if (norm.includes('snapshot') || norm.includes('vss') || norm.includes('ntfs') || norm.includes('shadow')) {
        reply = `Initiating NTFS Volume Shadow Copy Service (VSS) snapshot orchestration...\n\nVolume \`S:\\ [SciDataLake]\` is currently journaling at 100% integrity. I can generate a point-in-time state snapshot containing the active feedstock composition (${biomass.name} - THC: ${biomass.potency.thc}%, CBD: ${biomass.potency.cbd}%) and all flowsheet node characteristics.`;
        action = {
          type: 'CREATE_VSS_SNAPSHOT',
          payload: { volume: 'S:\\' },
          label: 'Deploy VSS Snapshot'
        };
      } else if (norm.includes('service') || norm.includes('wsl') || norm.includes('background') || norm.includes('scipy')) {
        reply = `Host Diagnostic Summary:\n- **WSL Distribution**: \`Ubuntu-24.04-LTS-SciCompute\` is **RUNNING** on WSL version 2.\n- **SciPy Toolchain**: Verified active. Nix reproducible environment flake is compiled and verified.\n- **Windows Services**: \`HempOS.Kernel.Service\` is executing in high-performance background mode with 0.4% host CPU usage.\n\nI can trigger a full health recalibration sweep across all WSL solver layers.`;
        action = {
          type: 'WSL_HEALTH_SWEEP',
          payload: {},
          label: 'Execute WSL Diagnostics Sweep'
        };
      } else if (norm.includes('audit') || norm.includes('telemetry') || norm.includes('log') || norm.includes('event')) {
        reply = `Scanning host **Windows Event Logs** in database partition...\n\n- Detected 0 Critical Crashes.\n- 1 warning in \`ScientificOS\` (Event ID 4022: Solvent density near envelope boundary during CO2 Extraction).\n\nWould you like to auto-inject a telemetry healing event and refresh the solver parameters?`;
        action = {
          type: 'HEAL_EVENT_LOGS',
          payload: {},
          label: 'Trigger Event-Log System Auto-Heal'
        };
      } else {
        reply = `I have received your request regarding: "${userMsg}".\n\nI am analyzing this command within the context of your Windows Subsystem for Hemp OS. I can translate this into a deterministic PowerShell cmdlet sequence or coordinate with the WSL scientific background executors to refine your refinery operations. Let me know if you would like to run a diagnostics check.`;
      }

      setCopilotChat(prev => [...prev, { sender: 'copilot', text: reply, action }]);
      setIsCopilotTyping(false);
    }, 1100);
  };

  const executeCopilotAction = (act: { type: string; payload: any }) => {
    if (act.type === 'UPDATE_DECARB_TEMP') {
      // Find stage and update its config temperature
      setGraph((prev: any) => {
        const stages = prev.stages.map((st: any) => {
          if (st.id === 'stage-decarb' || st.type.toLowerCase().includes('decarb')) {
            return {
              ...st,
              config: {
                ...st.config,
                temperatureC: act.payload.temp,
                tempC: act.payload.temp,
              }
            };
          }
          return st;
        });
        return { ...prev, stages };
      });
      // Simulate run
      setTimeout(() => runSimulation(), 100);
      
      // Post validation response
      setCopilotChat(prev => [...prev, {
        sender: 'copilot',
        text: `✔️ **Copilot Action Succeeded!** Calibrated the Decarboxylation thermal stage config. Temperature updated to **125°C** and thermodynamic solver has finished recalculating phase split dynamics.`
      }]);

      // Add to event logs
      addEventLogEntry('Information', 'ScientificOS', 2011, `Copilot API successfully updated stage calibration temperature to 125C. Solver recalculated successfully.`);
    } 
    else if (act.type === 'CREATE_VSS_SNAPSHOT') {
      triggerVssSnapshotCreation();
    }
    else if (act.type === 'WSL_HEALTH_SWEEP') {
      setCopilotChat(prev => [...prev, {
        sender: 'copilot',
        text: `✔️ **WSL Diagnostic Complete**: Calculated Nix store hash match 100% correct. SciPy linear program solver returned exit code 0. No package divergence found in \`Ubuntu-24.04-LTS-SciCompute\`.`
      }]);
      addEventLogEntry('Information', 'System', 7002, `WSL diagnostic sweep completed by local service watchdog.`);
    }
    else if (act.type === 'HEAL_EVENT_LOGS') {
      // Revert carbon dioxide extraction to stable pressures
      setGraph((prev: any) => {
        const stages = prev.stages.map((st: any) => {
          if (st.id === 'stage-extraction' || st.type.toLowerCase().includes('extract')) {
            return {
              ...st,
              config: {
                ...st.config,
                pressureBar: 220, // default stable
                co2FlowRate: 15.0
              }
            };
          }
          return st;
        });
        return { ...prev, stages };
      });
      setTimeout(() => runSimulation(), 100);

      setCopilotChat(prev => [...prev, {
        sender: 'copilot',
        text: `✔️ **Self-Healing Applied**: Stabilized CO2 extraction pressure boundary variables to **220 Bar**. Phase split warning successfully cleared from active event registries.`
      }]);
      addEventLogEntry('Success Audit', 'Security', 1002, `Self-healing policy resolved. Pressure stabilized to 220 Bar.`);
    }
  };


  // --- WINDOWS SERVICES DATA ---
  const [services, setServices] = useState<WindowsService[]>([
    {
      name: 'HempOS.Kernel.Service',
      displayName: 'Hemp OS Scientific Solver Engine',
      status: 'Running',
      cpu: 1.2,
      memoryMb: 145,
      pid: 4056,
      startupType: 'Automatic',
      description: 'Provides background continuous flowsheet simulations, thermodynamics phase envelope calculus, and local model parameters integration.'
    },
    {
      name: 'HempOS.CampaignScheduler.Service',
      displayName: 'Hemp OS Autonomous Campaign Scheduler',
      status: 'Running',
      cpu: 0.2,
      memoryMb: 42,
      pid: 8912,
      startupType: 'Automatic',
      description: 'Triggers automated, scheduled laboratory sweeps, calibration routines, and exports scientific results based on Windows Task Scheduler APIs.'
    },
    {
      name: 'HempOS.DriveSync.Service',
      displayName: 'Hemp OS Google Drive Local Mount-Sync',
      status: 'Running',
      cpu: 0.1,
      memoryMb: 64,
      pid: 10424,
      startupType: 'Manual',
      description: 'Orchestrates background document sync, folder watchers, and schedules Google Drive PDF ingestion directly into NTFS scientific data lakes.'
    },
    {
      name: 'HempOS.VssSnap.Service',
      displayName: 'Hemp OS Volume Shadow Copy Integration',
      status: 'Stopped',
      cpu: 0.0,
      memoryMb: 0,
      pid: 0,
      startupType: 'Manual',
      description: 'Interfaces with NTFS snapshot journal databases to record point-in-time chemical models, offering time-travel rollback capability.'
    },
    {
      name: 'HempOS.WslCompute.Gateway',
      displayName: 'Hemp OS WSL2 Nix Compute Interop Gateway',
      status: 'Running',
      cpu: 0.5,
      memoryMb: 92,
      pid: 11210,
      startupType: 'Automatic',
      description: 'Hosts high-speed local socket bridges to pipe physical simulations through compiled Nix libraries, PETSc, and COIN-OR solver systems inside WSL.'
    }
  ]);

  const toggleServiceStatus = (serviceName: string) => {
    setServices(prev => prev.map(srv => {
      if (srv.name === serviceName) {
        const nextStatus = srv.status === 'Running' ? 'Stopped' : 'Running';
        const nextCpu = nextStatus === 'Running' ? 0.4 : 0;
        const nextMem = nextStatus === 'Running' ? 45 : 0;
        const nextPid = nextStatus === 'Running' ? Math.floor(Math.random() * 8000) + 2000 : 0;
        
        addEventLogEntry(
          nextStatus === 'Running' ? 'Information' : 'Warning',
          'System',
          nextStatus === 'Running' ? 7036 : 7035,
          `Service ${srv.displayName} (${srv.name}) successfully transitioned to the ${nextStatus.toUpperCase()} state.`
        );

        return {
          ...srv,
          status: nextStatus,
          cpu: nextCpu,
          memoryMb: nextMem,
          pid: nextPid
        };
      }
      return srv;
    }));
  };

  const changeServiceStartup = (serviceName: string, startup: WindowsService['startupType']) => {
    setServices(prev => prev.map(srv => {
      if (srv.name === serviceName) {
        addEventLogEntry('Information', 'System', 7040, `Startup type of service ${srv.name} changed to ${startup}.`);
        return { ...srv, startupType: startup };
      }
      return srv;
    }));
  };


  // --- POWERSHELL COMMAND SHILL ---
  const [psHistory, setPsHistory] = useState<{ cmd: string; output: string[] }[]>([
    {
      cmd: 'Get-KernelHealth',
      output: [
        'Hemp OS Scientific Subsystem Health Diagnostics',
        '-----------------------------------------------',
        'Host System       : WINDOWS-SERVER-SCIEN-01',
        'Kernel Version    : v2.0.0-Deterministic',
        'Uptime            : 4 days, 12 hours, 44 minutes',
        'Physical Memory   : 32.0 GB (Total) / 14.2 GB (Available)',
        'Storage System    : NTFS Journal System on C:\\, S:\\ (Online)',
        'WSL Link Status   : ACTIVE (Socket link pipe healthy)',
        'Active Biomass    : ' + biomass.name + ' (' + biomass.mass + ' kg)',
        'Solver Stability  : 100.0% Converged (No Boundary Violations)',
        'Status            : HEALTHY'
      ]
    }
  ]);
  const [psInput, setPsInput] = useState('');
  const psEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    psEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [psHistory]);

  const handlePsCommand = () => {
    if (!psInput.trim()) return;
    const cmd = psInput.trim();
    let out: string[] = [];

    const tokens = cmd.split(' ');
    const primaryCmd = tokens[0].toLowerCase();

    if (primaryCmd === 'get-kernelhealth') {
      out = [
        'Hemp OS Scientific Subsystem Health Diagnostics',
        '-----------------------------------------------',
        'Host System       : WINDOWS-SERVER-SCIEN-01',
        'Kernel Version    : v2.0.0-Deterministic',
        'Uptime            : 4 days, 12 hours, 45 minutes',
        'Active Biomass    : ' + biomass.name + ' (' + biomass.mass + ' kg)',
        'Solver Status     : Converged on equilibrium state.',
        'WSL SciCompute    : CONNECTED (Ubuntu-24.04-LTS-SciCompute)',
        'NTFS Disk S:\\     : Journaling ACTIVE (Time travel enabled)',
        'Status            : 100% HEALTHY'
      ];
    } else if (primaryCmd === 'get-modelversion') {
      out = [
        'Model Name                  Version    Engine Type             Last Stabilized',
        '----------                  -------    -----------             ---------------',
        'HempOS.Decarb.Solver        v1.4.2     Thermal Kinetic         ' + new Date().toLocaleDateString(),
        'HempOS.Extraction.Fluid     v2.1.0     Redlich-Kwong EOS       ' + new Date().toLocaleDateString(),
        'HempOS.Winterization.Phase  v1.0.8     Phase Splitting LP      ' + new Date().toLocaleDateString(),
        'HempOS.Distillation.VLE     v3.2.1     Wilson Matrix Activity  ' + new Date().toLocaleDateString()
      ];
    } else if (primaryCmd === 'get-vsssnapshots') {
      out = [
        'VSS Snapshot ID                       Volume  Timestamp              Size GB   Feedstock Profile',
        '-------------------                       ------  ---------              -------   -----------------',
        ...vssSnapshots.map(s => `${s.id.padEnd(41)} ${s.volume.padEnd(7)} ${s.timestamp}  ${s.sizeGb.toFixed(2).padEnd(9)} ${s.stateSnapshot.biomassName}`)
      ];
    } else if (primaryCmd === 'get-wsldistributions') {
      out = [
        'Name                                     State          Version',
        '----                                     -----          -------',
        'Ubuntu-24.04-LTS-SciCompute              Running        2',
        'docker-desktop-data                      Running        2',
        'NixOS-WSL-Reproduce                      Stopped        2'
      ];
    } else if (primaryCmd === 'get-eventlog') {
      out = [
        'Index Time                Level         Source          EventID Message',
        '----- ----                -----         ------          ------- -------',
        ...eventLogs.slice(0, 10).map(e => `${e.id.toString().padEnd(5)} ${e.timestamp.split('T')[1].substring(0,8)} ${e.level.padEnd(13)} ${e.source.padEnd(15)} ${e.eventId.toString().padEnd(7)} ${e.message.substring(0, 45)}...`)
      ];
    } else if (primaryCmd === 'start-campaign') {
      out = [
        '✔️ Windows Task Scheduler registered campaign trigger.',
        'Action: Execute continuous sweeping across biomass feedstock compositions.',
        'Target Scheduler Task Name: \\HempOS\\DeterministicAutonomousCampaignSweep',
        'Trigger Frequency          : Daily at 02:00 AM',
        'Status                     : Scheduled and Active'
      ];
      addEventLogEntry('Information', 'System', 104, `Scheduler task '\\HempOS\\DeterministicAutonomousCampaignSweep' created by PowerShell session.`);
    } else if (primaryCmd === 'run-experiment') {
      // Find arguments
      const stageArgIdx = tokens.findIndex(t => t.toLowerCase() === '-stage');
      const tempArgIdx = tokens.findIndex(t => t.toLowerCase() === '-temp');
      
      let stageName = 'Decarboxylation';
      let tempVal = 120;

      if (stageArgIdx !== -1 && tokens[stageArgIdx + 1]) {
        stageName = tokens[stageArgIdx + 1].replace(/"/g, '');
      }
      if (tempArgIdx !== -1 && tokens[tempArgIdx + 1]) {
        tempVal = parseFloat(tokens[tempArgIdx + 1]);
      }

      // Update configuration stage temperature dynamically
      setGraph((prev: any) => {
        const stages = prev.stages.map((st: any) => {
          if (st.name.toLowerCase().includes(stageName.toLowerCase()) || st.id.includes(stageName.toLowerCase())) {
            return {
              ...st,
              config: {
                ...st.config,
                temperatureC: tempVal,
                tempC: tempVal,
              }
            };
          }
          return st;
        });
        return { ...prev, stages };
      });
      setTimeout(() => runSimulation(), 100);

      out = [
        '✔️ Triggering Experiment Campaign on Stage: ' + stageName,
        'Setting parameter config update: target value = ' + tempVal,
        'Status: Command successfully piped to local socket.',
        'Kernel physical solver executed successfully. Purity & yield predictions recalculated.'
      ];
      addEventLogEntry('Information', 'ScientificOS', 2012, `PowerShell PowerShell cmdlet 'Run-Experiment' forced stage calibration change.`);
    } else if (primaryCmd === 'invoke-calibration') {
      out = [
        '✔️ Initializing zero-drift digital calibration sweep...',
        'Piping test inputs through Redlich-Kwong EOS phase solver in WSL container...',
        'Vapor-Liquid Equilibrium (VLE) coefficients validated against NIST chemistry values.',
        'Calibration Status: VALID (Precision drift = 0.00000%)'
      ];
      addEventLogEntry('Success Audit', 'Security', 1005, `Digital calibration validated with zero drift.`);
    } else if (primaryCmd === 'clear') {
      setPsHistory([]);
      setPsInput('');
      return;
    } else if (primaryCmd === 'help') {
      out = [
        'Available Hemp OS PowerShell Cmdlets:',
        '  Get-KernelHealth         - Returns real-time health, system resources, and solver stability.',
        '  Get-ModelVersion         - Lists detailed version metadata for all physical stage solvers.',
        '  Get-VssSnapshots         - Retrieves NTFS journaling shadow copy restore matrices.',
        '  Get-WslDistributions     - Scans active Windows Subsystem for Linux instances.',
        '  Get-EventLog             - Retrieves simulated Windows Event log records.',
        '  Start-Campaign           - Configures Task Scheduler to trigger deterministic automated runs.',
        '  Run-Experiment           - Direct stage parameter calibration. Usage: Run-Experiment -Stage "Decarboxylation" -Temp 125',
        '  Invoke-Calibration       - Sweeps thermodynamic equations and aligns state grids.',
        '  clear                    - Clears terminal history.',
        '  help                     - Shows this help manual.'
      ];
    } else {
      out = [
        `ps: The term '${tokens[0]}' is not recognized as the name of a cmdlet, function, script file, or operable program.`,
        `Verify spelling or type 'help' to see cataloged scientific command sets.`
      ];
    }

    setPsHistory(prev => [...prev, { cmd, output: out }]);
    setPsInput('');
  };


  // --- WSL SCIENTIFIC COMPUTE DATA ---
  const [wslDistros, setWslDistros] = useState<WslDistro[]>([
    {
      name: 'Ubuntu-24.04-LTS-SciCompute',
      status: 'Running',
      version: 2,
      packages: [
        { name: 'python3-scipy', version: '1.12.0', purpose: 'Solves high-dimensional non-linear phase splits and mass flow constraints.' },
        { name: 'python3-numpy', version: '1.26.4', purpose: 'Handles multidimensional coordinate matrix arithmetic for ternary phase diagrams.' },
        { name: 'petsc-dev', version: '3.20.5', purpose: 'Portable, Extensible Toolkit for Scientific Computation (Sparse matrix solver).' },
        { name: 'sympy', version: '1.12', purpose: 'Performs analytical derivative equations for fluid thermal capacity equations.' },
        { name: 'coinor-cbc', version: '2.10.8', purpose: 'Branch-and-Cut mixed integer solver for optimizing daily pipeline sequences.' }
      ]
    },
    {
      name: 'NixOS-WSL-Reproduce',
      status: 'Stopped',
      version: 2,
      packages: [
        { name: 'nix-package-manager', version: '2.18.1', purpose: 'Provides isolated environment declarations to ensure 100% execution parity.' }
      ]
    }
  ]);

  const [nixFlakeCode, setNixFlakeCode] = useState(`{
  description = "Hemp OS Deterministic Chemistry Solver Environment Flake";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-23.11";
  };

  outputs = { self, nixpkgs }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs { inherit system; };
  in {
    devShells.\${system}.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        python311
        python311Packages.scipy
        python311Packages.numpy
        petsc
        coin-or-cbc
      ];
      shellHook = ''
        echo "=========================================================="
        echo " HEMP OS WSL2 SCIENTIFIC COMPUTE ENVIRONMENT ACTIVE"
        echo " Verified Nix Flake Hash matches build blueprint."
        echo "=========================================================="
      '';
    };
  };
}`);

  const [isNixCompiling, setIsNixCompiling] = useState(false);
  const [nixLogs, setNixLogs] = useState<string[]>([]);

  const handleRunNixCompilation = () => {
    setIsNixCompiling(true);
    setNixLogs([
      '[NIX] Initializing sandboxed environment generation...',
      '[NIX] Fetching channel: github:NixOS/nixpkgs/nixos-23.11...',
      '[NIX] Evaluating inputs and lock files...'
    ]);

    setTimeout(() => {
      setNixLogs(prev => [...prev, '[NIX] Instantiating derivation: /nix/store/g8x89k...-scipy-1.12.0.drv']);
    }, 400);

    setTimeout(() => {
      setNixLogs(prev => [...prev, '[NIX] Instantiating derivation: /nix/store/a5b12p...-petsc-3.20.5.drv']);
    }, 800);

    setTimeout(() => {
      setNixLogs(prev => [
        ...prev,
        '[NIX] Sandbox build complete. Generating profile link...',
        '✔️ Nix derivation hash: sha256-df523b12ac64f128e932ba0b...',
        '✔️ Nix dev shell environment activated inside WSL gateway.'
      ]);
      setIsNixCompiling(false);
      addEventLogEntry('Information', 'System', 3004, 'Nix reproducible build compilation successful. Shell hash verified.');
    }, 1300);
  };


  // --- VSS / NTFS SHADOW COPY SNAPSHOT MATRIX ---
  const [vssSnapshots, setVssSnapshots] = useState<VssSnapshot[]>([
    {
      id: 'VSS-SNAP-20260628-0400',
      volume: 'S:\\',
      timestamp: '2026-06-28 04:00 AM',
      sizeGb: 1.15,
      stateSnapshot: {
        biomassName: "Granddaddy Purple (GDP)",
        thc: 19.5,
        cbd: 0.12,
        cbg: 0.58,
        activeStageId: 'stage-decarb'
      }
    },
    {
      id: 'VSS-SNAP-20260629-1230',
      volume: 'S:\\',
      timestamp: '2026-06-29 12:30 PM',
      sizeGb: 1.22,
      stateSnapshot: {
        biomassName: "Charlotte's Web",
        thc: 0.28,
        cbd: 16.4,
        cbg: 0.65,
        activeStageId: 'stage-extraction'
      }
    }
  ]);

  const [activeVolume, setActiveVolume] = useState<'C:\\' | 'S:\\'>('S:\\');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  const triggerVssSnapshotCreation = () => {
    setIsCreatingSnapshot(true);
    addEventLogEntry('Information', 'System', 5013, `Volume Shadow Copy Service (VSS) received snapshot query for volume ${activeVolume}`);

    setTimeout(() => {
      const snapId = `VSS-SNAP-${new Date().toISOString().substring(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newSnap: VssSnapshot = {
        id: snapId,
        volume: activeVolume,
        timestamp: new Date().toLocaleString(),
        sizeGb: parseFloat((1.0 + Math.random() * 0.5).toFixed(2)),
        stateSnapshot: {
          biomassName: biomass.name,
          thc: biomass.potency.thc,
          cbd: biomass.potency.cbd,
          cbg: biomass.potency.cbg,
          activeStageId: activeStageId
        }
      };

      setVssSnapshots(prev => [newSnap, ...prev]);
      setIsCreatingSnapshot(false);

      setCopilotChat(prev => [...prev, {
        sender: 'copilot',
        text: `✔️ **NTFS VSS Snapshot Succeeded!** Generated point-in-time snapshot record \`${snapId}\` for Volume \`${activeVolume} [SciDataLake]\`.\n\nYou can perform a time-travel rollback at any time to restore this feedstock state.`
      }]);

      addEventLogEntry('Information', 'System', 5014, `Volume Shadow Copy Service created snapshot ${snapId} successfully.`);
    }, 1200);
  };

  const handleRollbackSnapshot = (snap: VssSnapshot) => {
    // Restore the biomass state from the snapshot values
    setBiomass((prev: any) => ({
      ...prev,
      name: snap.stateSnapshot.biomassName,
      potency: {
        ...prev.potency,
        thc: snap.stateSnapshot.thc,
        thca: parseFloat((snap.stateSnapshot.thc / 0.877).toFixed(2)),
        cbd: snap.stateSnapshot.cbd,
        cbda: parseFloat((snap.stateSnapshot.cbd / 0.877).toFixed(2)),
        cbg: snap.stateSnapshot.cbg,
        cbga: parseFloat((snap.stateSnapshot.cbg / 0.877).toFixed(2)),
      }
    }));

    setActiveStageId(snap.stateSnapshot.activeStageId);
    
    // Recalculate
    setTimeout(() => runSimulation(), 100);

    addEventLogEntry('Information', 'ScientificOS', 2013, `Time-travel rollback applied! State restored to snapshot ${snap.id}.`);
    
    // Add success chat message
    setCopilotChat(prev => [...prev, {
      sender: 'copilot',
      text: `⏪ **State Restored via VSS Rollback!** Recalibrated physical OS metrics to snapshot \`${snap.id}\`. Active feedstock reverted to **${snap.stateSnapshot.biomassName}**.`
    }]);
  };


  // --- EVENT LOGS TELEMETRY DATA ---
  const [eventLogs, setEventLogs] = useState<EventLogEntry[]>([
    { id: 1, level: 'Information', timestamp: new Date(Date.now() - 50000).toISOString(), source: 'ScientificOS', category: 'Thermodynamics', eventId: 2011, message: 'Solver converged after 3 equilibrium split iterations.' },
    { id: 2, level: 'Success Audit', timestamp: new Date(Date.now() - 120000).toISOString(), source: 'Security', category: 'Access Control', eventId: 1001, message: 'Systems Engineer Tap4500 verified securely via Active Directory authentication.' },
    { id: 3, level: 'Warning', timestamp: new Date(Date.now() - 300000).toISOString(), source: 'ScientificOS', category: 'Solver Boundary', eventId: 4022, message: 'Decarboxylation kinetics showing reaction speed near envelope threshold.' },
    { id: 4, level: 'Information', timestamp: new Date(Date.now() - 600000).toISOString(), source: 'System', category: 'Task Scheduler', eventId: 102, message: 'Task scheduler triggered routine baseline drive synchronization.' },
    { id: 5, level: 'Error', timestamp: new Date(Date.now() - 1200000).toISOString(), source: 'System', category: 'Disk IO', eventId: 5011, message: 'Shadow copy snapshot cache size is running tight on C:\\ partition.' }
  ]);

  const [selectedEvent, setSelectedEvent] = useState<EventLogEntry | null>(null);
  const [eventFilterSource, setEventFilterSource] = useState<string>('ALL');
  const [eventFilterLevel, setEventFilterLevel] = useState<string>('ALL');

  const addEventLogEntry = (level: EventLogEntry['level'], source: string, eventId: number, message: string) => {
    const newEntry: EventLogEntry = {
      id: eventLogs.length + 1,
      level,
      timestamp: new Date().toISOString(),
      source,
      category: source === 'Security' ? 'Security Audit' : source === 'ScientificOS' ? 'Physics Solver' : 'General System',
      eventId,
      message
    };
    setEventLogs(prev => [newEntry, ...prev]);
  };

  const filteredLogs = eventLogs.filter(log => {
    const srcMatch = eventFilterSource === 'ALL' || log.source === eventFilterSource;
    const lvlMatch = eventFilterLevel === 'ALL' || log.level === eventFilterLevel;
    return srcMatch && lvlMatch;
  });


  // --- LIVE EVENT TELEMETRY CHART HELPER ---
  // Simple fake live performance data for memory & CPU tracking
  const [perfHistory, setPerfHistory] = useState<{ time: string; cpu: number; mem: number }[]>([
    { time: '10:00', cpu: 1.5, mem: 145 },
    { time: '10:01', cpu: 1.8, mem: 146 },
    { time: '10:02', cpu: 1.2, mem: 145 },
    { time: '10:03', cpu: 2.1, mem: 148 },
    { time: '10:04', cpu: 1.7, mem: 147 },
    { time: '10:05', cpu: 1.4, mem: 145 },
    { time: '10:06', cpu: 1.9, mem: 146 },
    { time: '10:07', cpu: 2.3, mem: 148 },
    { time: '10:08', cpu: 1.6, mem: 146 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPerfHistory(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const nextCpu = parseFloat((1.0 + Math.random() * 1.5).toFixed(1));
        const nextMem = Math.round(144 + Math.random() * 5);
        return [...prev.slice(1), { time: nextTime, cpu: nextCpu, mem: nextMem }];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#0b0b0c] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl">
      
      {/* 1. LAYER BANNER */}
      <div className="bg-gradient-to-r from-[#111113] to-[#0d0d0f] p-6 border-b border-[#1f1f21] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <h2 className="text-sm font-bold text-white uppercase tracking-widest font-mono flex items-center gap-2">
              Hemp OS Windows Integration & Telemetry <span className="text-[#666] font-normal italic text-xs">Layer 12</span>
            </h2>
          </div>
          <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase leading-relaxed max-w-3xl">
            Orchestrates Native Subsystem Bridges, Active Directory Security, Windows Shadow Volume Backups, PowerShell Script Automation, WSL Ubuntu Nix solvers, and interactive Microsoft Copilot interfaces.
          </p>
        </div>

        {/* Dynamic Windows Active Status Indicators */}
        <div className="flex gap-3 bg-[#0a0a0b] p-2 rounded-xl border border-[#1f1f21] shrink-0 font-mono text-[8.5px]">
          <div className="flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-gray-400">Host OS:</span>
            <span className="text-emerald-400 font-bold">WINDOWS SERVER</span>
          </div>
          <div className="w-px h-3.5 bg-[#1f1f21]" />
          <div className="flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-gray-400">WSL Pipe:</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* 2. TAB CONTROL SHELF */}
      <div className="bg-[#121214] border-b border-[#1f1f21] px-6 py-2.5 flex items-center justify-between shadow-sm overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { id: 'copilot', label: 'Copilot AI Interface', icon: Sparkles, color: 'text-purple-400', desc: 'Natural Language Console' },
            { id: 'services', label: 'Services Supervisor', icon: Server, color: 'text-emerald-400', desc: 'Background Daemon Operator' },
            { id: 'powershell', label: 'PowerShell Terminal', icon: TerminalIcon, color: 'text-[#38bdf8]', desc: 'Scientific Cmdlet Deck' },
            { id: 'wsl', label: 'WSL2 & Nix Compute', icon: Boxes, color: 'text-cyan-400', desc: 'SciPy & SymPy Container' },
            { id: 'vss', label: 'Shadow Copies (VSS)', icon: HardDrive, color: 'text-amber-400', desc: 'Time-Travel Rollback' },
            { id: 'eventlog', label: 'Diagnostics & Event Log', icon: FileText, color: 'text-rose-400', desc: 'System Telemetry Registry' }
          ].map(tab => {
            const Icon = tab.icon;
            const isSel = winTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWinTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer min-w-[170px] ${
                  isSel
                    ? 'bg-[#1b1b1e] border-blue-500 shadow-md ring-1 ring-blue-500/10'
                    : 'bg-[#0d0d0f] border-[#1f1f21] hover:bg-[#1b1b1e] hover:border-[#2d2d30]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                  <span className={`text-[9.5px] font-bold uppercase tracking-wider ${isSel ? 'text-white' : 'text-[#888]'}`}>
                    {tab.label}
                  </span>
                </div>
                <span className="text-[7.5px] font-mono text-[#555] pl-5 uppercase tracking-widest">
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. WORKING GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#1f1f21]">
        
        {/* =======================================================
            LEFT WORKSPACE PANEL (7 COLS): INTERACTIVE CONTROLS
            ======================================================= */}
        <div className="lg:col-span-8 p-6 space-y-6">

          {/* VIEW 1: COPILOT RESEARCH INTERFACE */}
          {winTab === 'copilot' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f21]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Microsoft Copilot - System Research Interface</h3>
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase px-2 py-0.5 bg-[#121214] border border-[#1f1f21] rounded">
                  Active Connection: Copilot v3.5
                </span>
              </div>

              {/* Chat Canvas */}
              <div className="bg-[#0a0a0b] border border-[#1f1f21] rounded-2xl p-4 h-[350px] overflow-y-auto space-y-4 font-mono text-[10.5px]">
                {copilotChat.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow'
                    }`}>
                      {msg.sender === 'user' ? 'U' : 'Co'}
                    </div>

                    <div className="space-y-2">
                      <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-blue-950/20 border border-blue-500/30 text-blue-200'
                          : 'bg-[#121214] border border-[#1f1f21] text-gray-300'
                      }`}>
                        {msg.text}
                      </div>

                      {/* Associated Interactive Trigger Actions */}
                      {msg.action && (
                        <button
                          type="button"
                          onClick={() => executeCopilotAction(msg.action!)}
                          className="px-3.5 py-1.5 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 hover:border-purple-500 text-purple-300 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ml-1 shadow"
                        >
                          <Zap className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                          <span>{msg.action.label}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isCopilotTyping && (
                  <div className="flex gap-3 mr-auto items-center">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[9px] font-bold">
                      Co
                    </div>
                    <div className="bg-[#121214] border border-[#1f1f21] p-3 rounded-2xl text-gray-500 italic text-[10px]">
                      Copilot is scanning NTFS registry matrices...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCopilotSend()}
                  placeholder="Ask Copilot to execute thermodynamic updates, NTFS snapshots, service sweeps..."
                  className="flex-1 bg-[#0d0d0f] border border-[#1f1f21] focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopilotSend}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-900/20 shrink-0"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: WINDOWS SERVICES SUPERVISOR */}
          {winTab === 'services' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f21]">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Windows Services Operator Control Panel</h3>
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase px-2 py-0.5 bg-[#121214] border border-[#1f1f21] rounded">
                  Total Managed Services: 5
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[410px] overflow-y-auto pr-1">
                {services.map((srv, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      srv.status === 'Running'
                        ? 'bg-emerald-950/5 border-emerald-900/20 hover:border-emerald-500/30'
                        : 'bg-[#121214] border-[#1f1f21] hover:border-gray-700/50'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-white font-mono">{srv.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[7px] font-mono uppercase font-black ${
                          srv.status === 'Running'
                            ? 'bg-emerald-950/50 border border-emerald-500/20 text-emerald-400'
                            : 'bg-red-950/50 border border-red-500/20 text-red-400'
                        }`}>
                          ● {srv.status}
                        </span>
                        <span className="text-[7.5px] font-mono text-gray-500 bg-[#0d0d0f] px-1.5 rounded uppercase border border-[#1c1c1f]">
                          PID: {srv.pid || 'N/A'}
                        </span>
                      </div>
                      
                      <h4 className="text-[10px] text-gray-400 font-bold">{srv.displayName}</h4>
                      <p className="text-[9.5px] text-gray-500 leading-normal font-mono">{srv.description}</p>
                    </div>

                    {/* Operational Action Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center font-mono">
                      
                      {/* Startup configuration picker */}
                      <select
                        value={srv.startupType}
                        onChange={(e) => changeServiceStartup(srv.name, e.target.value as any)}
                        className="bg-[#0d0d0f] border border-[#1f1f21] rounded px-1.5 py-1 text-[8.5px] text-gray-400 focus:outline-none focus:border-blue-500"
                      >
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="Disabled">Disabled</option>
                      </select>

                      {/* Start/Stop Button */}
                      <button
                        type="button"
                        onClick={() => toggleServiceStatus(srv.name)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 border ${
                          srv.status === 'Running'
                            ? 'bg-red-950/10 border-red-900/30 text-red-400 hover:bg-red-900/20 hover:border-red-500/50'
                            : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/20 hover:border-emerald-500/50'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{srv.status === 'Running' ? 'Stop' : 'Start'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 3: POWERSHELL INTERACTIVE COMMAND DECK */}
          {winTab === 'powershell' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f21]">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Windows PowerShell Script Console</h3>
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase px-2 py-0.5 bg-[#121214] border border-[#1f1f21] rounded">
                  Subsystem: SciPowerShell v7.4
                </span>
              </div>

              {/* Terminal Frame */}
              <div className="bg-[#05050a] border border-[#1a1a2e] rounded-2xl p-4.5 h-[340px] overflow-y-auto space-y-4 font-mono text-[10px] text-sky-200">
                <div className="text-gray-500 mb-2 leading-relaxed">
                  Windows PowerShell<br />
                  Copyright (C) Microsoft Corporation. All rights reserved.<br /><br />
                  Loading Hemp OS Cmdlets... Complete.<br />
                  Type 'help' to retrieve a list of continuous scientific commands.
                </div>

                {psHistory.map((h, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-white font-bold">
                      <span className="text-emerald-500">PS S:\SciDataLake&gt;</span>
                      <span>{h.cmd}</span>
                    </div>
                    <div className="text-sky-300 leading-relaxed whitespace-pre-wrap pl-4 border-l border-sky-900/50">
                      {h.output.map((line, lIdx) => (
                        <div key={lIdx}>{line}</div>
                      ))}
                    </div>
                  </div>
                ))}
                <div ref={psEndRef} />
              </div>

              {/* Input Command Line */}
              <div className="flex gap-2">
                <div className="bg-[#0d0d0f] border border-[#1f1f21] rounded-xl flex-1 flex items-center px-3.5 py-1">
                  <span className="font-mono text-[9px] text-emerald-500 shrink-0 font-bold mr-1.5 select-none">PS S:\&gt;</span>
                  <input
                    type="text"
                    value={psInput}
                    onChange={(e) => setPsInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePsCommand()}
                    placeholder="Get-KernelHealth, Run-Experiment, Get-ModelVersion..."
                    className="flex-1 bg-transparent focus:outline-none text-xs text-white font-mono h-8 placeholder-gray-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePsCommand}
                  className="px-5 py-2.5 bg-sky-700 hover:bg-sky-600 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow shrink-0"
                >
                  Run Cmd
                </button>
              </div>
            </div>
          )}

          {/* VIEW 4: WSL2 & NIX CO-ORCHESTRATION */}
          {winTab === 'wsl' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f21]">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">WSL2 Container & Nix Reproducible Builds</h3>
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase px-2 py-0.5 bg-[#121214] border border-[#1f1f21] rounded">
                  WSL Virtualization Pipe: ACTIVE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Left side: Distros and package details */}
                <div className="md:col-span-5 space-y-4">
                  <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-3.5 space-y-2.5">
                    <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Active WSL Distros</span>
                    {wslDistros.map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-[#0d0d0f] border border-[#1c1c1f] p-2 rounded font-mono text-[9px]">
                        <div>
                          <div className="text-white font-bold">{d.name}</div>
                          <span className="text-[7px] text-gray-500">WSL VERSION: {d.version}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[6.5px] font-bold ${
                          d.status === 'Running' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : 'bg-gray-950 text-gray-500 border border-gray-800'
                        }`}>
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-3.5 space-y-2">
                    <span className="text-[8.5px] font-mono text-gray-500 uppercase tracking-widest block font-bold">WSL Scientific Toolchain</span>
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-0.5">
                      {wslDistros[0].packages.map((pkg, idx) => (
                        <div key={idx} className="bg-[#0d0d0f] border border-[#1c1c1f] p-2 rounded flex flex-col gap-0.5">
                          <div className="flex justify-between items-center text-[9px] font-mono">
                            <span className="text-cyan-400 font-bold">{pkg.name}</span>
                            <span className="text-gray-500 text-[8px]">v{pkg.version}</span>
                          </div>
                          <p className="text-[8px] text-gray-400 leading-snug">{pkg.purpose}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right side: Interactive Nix build */}
                <div className="md:col-span-7 bg-[#121214] border border-[#1f1f21] rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center border-b border-[#1c1c1f] pb-1.5">
                      <span className="font-bold text-white text-[10.5px] font-mono uppercase">Reproducible Nix Flake (\`flake.nix\`)</span>
                      <span className="px-1.5 py-0.5 bg-blue-950/20 text-blue-400 text-[7px] font-mono rounded font-bold uppercase">SHA256 Matcher</span>
                    </div>
                    <textarea
                      value={nixFlakeCode}
                      onChange={(e) => setNixFlakeCode(e.target.value)}
                      className="w-full h-[150px] bg-[#0d0d0f] border border-[#1f1f21] rounded p-2.5 font-mono text-[9px] text-emerald-400 focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Nix Compiling Status Logs */}
                  {nixLogs.length > 0 && (
                    <div className="bg-[#05050a] border border-[#1a1a2e] p-2.5 rounded font-mono text-[8px] text-gray-400 space-y-1 max-h-[100px] overflow-y-auto">
                      {nixLogs.map((log, idx) => (
                        <div key={idx}>{log}</div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleRunNixCompilation}
                    disabled={isNixCompiling}
                    className="w-full py-2 bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 font-mono text-[9.5px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isNixCompiling ? 'animate-spin' : ''}`} />
                    <span>{isNixCompiling ? 'Compiling Nix Store Derivation...' : 'Execute Nix-Build Derivation'}</span>
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* VIEW 5: VOLUME SHADOW COPIES (VSS) TIMETRAVEL ROLLBACK */}
          {winTab === 'vss' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f21]">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">NTFS Volume Shadow Copy Service (VSS)</h3>
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase px-2 py-0.5 bg-[#121214] border border-[#1f1f21] rounded">
                  System Snapshots Journal: NTFS VSS API
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Left snapshot controller */}
                <div className="md:col-span-5 bg-[#121214] border border-[#1f1f21] rounded-xl p-4.5 flex flex-col justify-between min-h-[250px]">
                  <div className="space-y-3 font-mono">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Deploy Shadow Snapshot</span>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      VSS freezes the current analytical state registry and creates an immutable, read-only shadow copy onto NTFS sectors. You can roll back to any point-in-time instantly.
                    </p>

                    <div>
                      <span className="text-gray-500 text-[8px] uppercase font-bold block mb-1">Target Journal Partition</span>
                      <div className="flex gap-2">
                        {['C:\\', 'S:\\ [SciDataLake]'].map(vol => (
                          <button
                            key={vol}
                            type="button"
                            onClick={() => setActiveVolume(vol.includes('C') ? 'C:\\' : 'S:\\')}
                            className={`px-3 py-1.5 rounded font-bold text-[8.5px] cursor-pointer transition-all border ${
                              activeVolume === (vol.includes('C') ? 'C:\\' : 'S:\\')
                                ? 'bg-amber-950/30 border-amber-500 text-amber-300'
                                : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
                            }`}
                          >
                            {vol}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={triggerVssSnapshotCreation}
                    disabled={isCreatingSnapshot}
                    className="w-full py-2 bg-amber-900/20 hover:bg-amber-900/40 border border-amber-500/30 text-amber-300 font-mono text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isCreatingSnapshot ? 'Freezing NTFS Sectors...' : 'Create Volume Shadow Copy'}</span>
                  </button>
                </div>

                {/* Right snapshot journal listings */}
                <div className="md:col-span-7 bg-[#121214] border border-[#1f1f21] rounded-xl p-4.5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest font-bold block">Point-in-Time Snapshot Registry</span>
                    <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                      {vssSnapshots.map((snap, idx) => (
                        <div key={idx} className="bg-[#0d0d0f] border border-[#1c1c1f] rounded-xl p-3 flex justify-between items-center gap-4 transition-all hover:border-amber-500/20 font-mono">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white font-bold">{snap.id}</span>
                              <span className="text-[7.5px] text-gray-500 bg-[#121214] px-1 rounded border border-[#1f1f21]">{snap.volume}</span>
                            </div>
                            <div className="text-[8px] text-gray-400">
                              Feedstock Profile: <strong className="text-amber-400 font-black">{snap.stateSnapshot.biomassName}</strong>
                            </div>
                            <p className="text-[7.5px] text-gray-500">{snap.timestamp} • {snap.sizeGb} GB sector size</p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRollbackSnapshot(snap)}
                            className="px-2.5 py-1.5 bg-amber-950/40 hover:bg-amber-950/60 border border-amber-500/20 text-amber-300 text-[8px] font-bold uppercase tracking-widest rounded transition-all cursor-pointer flex items-center gap-1 shadow"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-400" />
                            <span>Rollback</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW 6: DIAGNOSTICS & WINDOWS EVENT LOG TELEMETRY */}
          {winTab === 'eventlog' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#1f1f21]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Windows Event Viewer - Scientific Subsystem logs</h3>
                </div>
                <span className="text-[8px] font-mono text-gray-500 uppercase px-2 py-0.5 bg-[#121214] border border-[#1f1f21] rounded">
                  System Diagnostics: Event Viewer API
                </span>
              </div>

              {/* Faceted Log Filters */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-[#121214] border border-[#1f1f21] p-3 rounded-xl font-mono text-[9px] text-gray-400 items-center">
                <div className="md:col-span-5 flex items-center gap-2">
                  <span>Log Channel:</span>
                  <div className="flex gap-1.5">
                    {['ALL', 'ScientificOS', 'System', 'Security'].map(src => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setEventFilterSource(src)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-all border ${
                          eventFilterSource === src
                            ? 'bg-rose-950/30 border-rose-500 text-rose-300'
                            : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
                        }`}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-5 flex items-center gap-2">
                  <span>Level:</span>
                  <div className="flex gap-1.5">
                    {['ALL', 'Information', 'Warning', 'Error'].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setEventFilterLevel(lvl)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-all border ${
                          eventFilterLevel === lvl
                            ? 'bg-rose-950/30 border-rose-500 text-rose-300'
                            : 'bg-[#0d0d0f] border-[#1f1f21] text-gray-500 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 text-right">
                  <span className="text-gray-500 text-[8px]">Filtered: {filteredLogs.length} events</span>
                </div>
              </div>

              {/* Event table */}
              <div className="bg-[#0a0a0b] border border-[#1f1f21] rounded-2xl overflow-hidden font-mono text-[9px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#121214] border-b border-[#1f1f21] text-gray-400 font-bold uppercase tracking-wider">
                      <th className="p-2.5 w-[14%]">Level</th>
                      <th className="p-2.5 w-[12%]">Time</th>
                      <th className="p-2.5 w-[14%]">Source</th>
                      <th className="p-2.5 w-[10%]">Event ID</th>
                      <th className="p-2.5">Diagnostic Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f1f21] text-gray-300">
                    {filteredLogs.map((log) => (
                      <tr 
                        key={log.id} 
                        onClick={() => setSelectedEvent(log)}
                        className="hover:bg-[#121214] cursor-pointer transition-all"
                      >
                        <td className="p-2.5 flex items-center gap-1.5 font-bold">
                          {log.level === 'Information' && <Info className="w-3 h-3 text-sky-400" />}
                          {log.level === 'Warning' && <AlertTriangle className="w-3 h-3 text-amber-500 animate-pulse" />}
                          {log.level === 'Error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                          {log.level === 'Success Audit' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                          <span className={
                            log.level === 'Error' ? 'text-red-400' :
                            log.level === 'Warning' ? 'text-amber-500' :
                            log.level === 'Success Audit' ? 'text-emerald-400' :
                            'text-sky-300'
                          }>{log.level}</span>
                        </td>
                        <td className="p-2.5 text-gray-500">{log.timestamp.split('T')[1].substring(0, 8)}</td>
                        <td className="p-2.5 text-[#aaa] font-bold">{log.source}</td>
                        <td className="p-2.5 text-[#888]">{log.eventId}</td>
                        <td className="p-2.5 truncate max-w-[280px]">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* =======================================================
            RIGHT TELEMETRY PANEL (5 COLS): PERFORMANCE & STATS
            ======================================================= */}
        <div className="lg:col-span-4 p-6 space-y-6 flex flex-col justify-between">
          
          {/* Section 1: Active Host Monitor & Live Telemetry Chart */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold font-mono text-blue-400 uppercase tracking-widest">Active Host telemetry</span>
            </div>

            <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4.5 space-y-3.5">
              <div className="flex justify-between items-center font-mono text-[9px] text-gray-500">
                <span className="uppercase">Live Server Resources</span>
                <span className="text-emerald-400 font-bold animate-pulse">● SAMPLING ACTIVE</span>
              </div>

              {/* Area chart of CPU and memory */}
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={perfHistory} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                    <XAxis dataKey="time" stroke="#444" fontSize={7} tickLine={false} />
                    <YAxis stroke="#444" fontSize={7} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0c0c0e', borderColor: '#1f1f21', fontSize: '9px', fontFamily: 'monospace' }} />
                    <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.05)" strokeWidth={1.5} name="Host CPU %" />
                    <Area type="monotone" dataKey="mem" stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.05)" strokeWidth={1.5} name="Memory MB" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Numerical Indicators */}
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-[#0d0d0f] border border-[#1f1f21] p-2 rounded">
                  <span className="text-[#555] text-[7.5px] uppercase block">Host CPU Core Usage</span>
                  <span className="text-xs text-white font-bold">{(perfHistory[perfHistory.length - 1]?.cpu || 1.6).toFixed(1)} %</span>
                </div>
                <div className="bg-[#0d0d0f] border border-[#1f1f21] p-2 rounded">
                  <span className="text-[#555] text-[7.5px] uppercase block">WSL Memory Committed</span>
                  <span className="text-xs text-white font-bold">{perfHistory[perfHistory.length - 1]?.mem || 146} MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Active Directory Governance Summary */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#1f1f21]">
              <Fingerprint className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold font-mono text-indigo-400 uppercase tracking-widest">Active Directory Credentials</span>
            </div>

            <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-4 space-y-3 font-mono text-[9px] text-gray-400 leading-normal">
              <div className="flex justify-between items-center text-white border-b border-[#1c1c1f] pb-2">
                <span>Principal Operator</span>
                <span className="text-[#aaa] font-bold">Tap4500 (Systems Eng)</span>
              </div>
              <div>
                <span className="text-[#555] text-[8px] uppercase font-bold block mb-1">Assigned Security ACLs</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 bg-indigo-950/20 border border-indigo-500/20 text-indigo-300 rounded font-bold uppercase text-[7.5px]">SeDebugPrivilege</span>
                  <span className="px-2 py-0.5 bg-indigo-950/20 border border-indigo-500/20 text-indigo-300 rounded font-bold uppercase text-[7.5px]">SeBackupPrivilege</span>
                  <span className="px-2 py-0.5 bg-indigo-950/20 border border-indigo-500/20 text-indigo-300 rounded font-bold uppercase text-[7.5px]">WSL_Root</span>
                </div>
              </div>
              <p className="text-[8px] text-gray-500 uppercase mt-2">
                *NTFS security descriptors automatically locked to Group Policy hash configurations. Any parameter boundary overrides will trigger security alerts inside the local security authority subsystem (LSASS).
              </p>
            </div>
          </div>

          {/* Section 3: Event Details Popup Simulator */}
          <AnimatePresence>
            {selectedEvent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121214] border border-rose-500/20 rounded-xl p-4 space-y-3 relative shadow-xl font-mono text-[9px]"
              >
                <div className="flex justify-between items-center border-b border-[#1f1f21] pb-2">
                  <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Event Properties (ID {selectedEvent.eventId})
                  </span>
                  <button 
                    type="button"
                    onClick={() => setSelectedEvent(null)}
                    className="text-gray-500 hover:text-white uppercase font-black text-[9px] cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                
                <div className="space-y-1.5 leading-relaxed">
                  <div><strong className="text-gray-500">Source:</strong> <span className="text-white">{selectedEvent.source}</span></div>
                  <div><strong className="text-gray-500">Log Name:</strong> <span className="text-white">ScientificOS_EventJournal</span></div>
                  <div><strong className="text-gray-500">Category:</strong> <span className="text-white">{selectedEvent.category}</span></div>
                  <div><strong className="text-gray-500">Timestamp:</strong> <span className="text-white">{new Date(selectedEvent.timestamp).toLocaleString()}</span></div>
                  <div><strong className="text-gray-500">Security:</strong> <span className="text-[#888]">NT AUTHORITY\\SYSTEM</span></div>
                </div>

                <div className="bg-[#0a0a0b] border border-[#1c1c1f] p-2 rounded text-gray-300 leading-normal max-h-[100px] overflow-y-auto">
                  {selectedEvent.message}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
