#!/bin/bash
# RFdiffusion binder/scaffolding/etc via Singularity
# Args: $1=PDB_FILE  $2=WORKINGDIR  $3=ACCOUNT  $4=STATUS_FILE
#
# Container notes (rfdiffusion_x86.def):
#   - Models are in the Python site-packages path (moved during build),
#     NOT in /app/RFdiffusion/models — do NOT pass inference.model_directory_path
#   - Schedules must bind to /app/RFdiffusion/schedules (runscript cds there)
#   - Runscript: cd /app/RFdiffusion && exec python3.9 scripts/run_inference.py "$@"

PDB_FILE=$1
WORKINGDIR=$2
ACCOUNT=$3
STATUS_FILE=$4

export DIFFUSION_LOG_FILE="${LOGDIR}/diffusion_job.log"
DIFFUSION_SLURM_SCRIPT="${INPUT_DIR}/diffusion_job.slurm"

# ── Conditional flags ─────────────────────────────────────────────────────

# Symmetry mode requires --config-name symmetry
CONFIG_NAME_ARG=""
if [ "${USE_SYMMETRY_CONFIG}" = "1" ]; then
  CONFIG_NAME_ARG="--config-name symmetry"
fi

# RFdiffusion always needs an input_pdb path even for unconditional generation
# (the code loads it to initialise the sampler but ignores the structure when
#  the contigs are purely generative, e.g. [100-200]).
# Fall back to the example PDB shipped inside the container.
INPUT_PDB_ARG="inference.input_pdb=/app/RFdiffusion/examples/input_pdbs/1qys.pdb"
if [ -n "${PDB_FILE}" ] && [ -f "${PDB_FILE}" ]; then
  INPUT_PDB_ARG="inference.input_pdb=/inputs/$(basename "${PDB_FILE}")"
fi

# ── Generate SLURM job script ─────────────────────────────────────────────
cat > "${DIFFUSION_SLURM_SCRIPT}" << EOF
#!/bin/bash
#SBATCH --job-name=rfdiffusion
#SBATCH --nodes=1
#SBATCH --ntasks=8
#SBATCH --mem=60GB
#SBATCH --gpus=1
#SBATCH --time=10:00:00
#SBATCH --partition=standard
#SBATCH --account=${ACCOUNT}
#SBATCH --output=${DIFFUSION_LOG_FILE}

# --cleanenv: prevents host Python/conda packages shadowing container's
# Schedules bind to /app/RFdiffusion/schedules (matches container runscript CWD)
# No inference.model_directory_path: models live in Python site-packages (baked in at build)
singularity exec --cleanenv --nv \\
  --bind "${INPUT_DIR}":/inputs \\
  --bind "${STRUCT}":/outputs \\
  --bind "${RUN_DIR}/schedules":/app/RFdiffusion/schedules \\
  ${DIFFUSION_SIF} \\
  python3.9 /app/RFdiffusion/scripts/run_inference.py \\
    ${CONFIG_NAME_ARG} \\
    ${INPUT_PDB_ARG} \\
    inference.output_prefix=/outputs/design \\
    inference.model_directory_path=/usr/local/lib/python3.9/dist-packages/rfdiffusion/models \\
    inference.schedule_directory_path=/app/RFdiffusion/schedules \\
    inference.num_designs=${NUM_DESIGNS} \\
    ${DIFFUSION_PARAMS}
EOF

chmod +x "${DIFFUSION_SLURM_SCRIPT}"

# ── Submit ────────────────────────────────────────────────────────────────
DIFFUSION_JOB_ID=$(sbatch "${DIFFUSION_SLURM_SCRIPT}" | awk '{print $4}')
export DIFFUSION_JOB_ID
echo "RFdiffusion job submitted: ${DIFFUSION_JOB_ID}"
