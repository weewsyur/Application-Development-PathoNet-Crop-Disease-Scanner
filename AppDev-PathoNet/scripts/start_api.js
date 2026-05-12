const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const SCRIPT = path.resolve(__dirname, "../run_api_server.py");
const BACKBONE = process.env.CNN_BACKBONE ?? "mobilenetv3_small";
const WEIGHTS = process.env.CNN_WEIGHTS ?? "";
const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");
const venvCandidates = process.platform === "win32"
  ? [
    path.join(projectRoot, ".venv", "Scripts", "python.exe"),
    path.join(workspaceRoot, ".venv", "Scripts", "python.exe"),
  ]
  : [
    path.join(projectRoot, ".venv", "bin", "python"),
    path.join(workspaceRoot, ".venv", "bin", "python"),
  ];
const resolvedVenvCandidates = venvCandidates
  .filter((p) => fs.existsSync(p))
  .map((p) => ({ cmd: p, extraArgs: [] }));

const pythonCandidates =
  process.env.PYTHON_BIN?.trim()
    ? [{ cmd: process.env.PYTHON_BIN.trim(), extraArgs: [] }]
    : [
      ...resolvedVenvCandidates,
      ...(process.platform === "win32"
        ? [
          { cmd: "python", extraArgs: [] },
          { cmd: "py", extraArgs: ["-3"] },
          { cmd: "py", extraArgs: [] },
        ]
        : [
          { cmd: "python3", extraArgs: [] },
          { cmd: "python", extraArgs: [] },
        ]),
    ];

// Updated to use run_api_server.py which doesn't need --serve flag
const apiArgs = [];
let currentProc = null;

const wireExitHandlers = () => {
  process.on("exit", () => currentProc?.kill());
  process.on("SIGINT", () => {
    currentProc?.kill();
    process.exit();
  });
  process.on("SIGTERM", () => {
    currentProc?.kill();
    process.exit();
  });
};

const launchCandidate = (idx) => {
  if (idx >= pythonCandidates.length) {
    console.error(
      "[PathoNet] Failed to start CNN API. No working Python executable found.",
    );
    process.exit(1);
    return;
  }

  const candidate = pythonCandidates[idx];
  const spawnArgs = [...candidate.extraArgs, SCRIPT, ...apiArgs];
  console.log(
    `[PathoNet] Starting CNN API v2: ${candidate.cmd} ${spawnArgs.join(" ")}`,
  );

  currentProc = spawn(candidate.cmd, spawnArgs, {
    stdio: "inherit",
    env: {
      ...process.env,
      FLASK_ENV: "production",
      PYTHONUTF8: "1",
      PYTHONIOENCODING: "utf-8",
    },
  });

  currentProc.on("error", () => {
    launchCandidate(idx + 1);
  });

  currentProc.on("exit", (code) => {
    if (code === 9009 || code === 127) {
      launchCandidate(idx + 1);
      return;
    }
    console.log(`[PathoNet] CNN API exited with code ${code}`);
  });
};

wireExitHandlers();
launchCandidate(0);
