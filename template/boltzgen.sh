#!/bin/bash
# BoltzGen binder design via Singularity
# Args: $1=DESIGN_SPEC  $2=WORKINGDIR  $3=ACCOUNT  $4=STATUS_FILE

DESIGN_SPEC=$1
WORKINGDIR=$2
ACCOUNT=$3
STATUS_FILE=$4

export BOLTZ_LOG_FILE="${LOGDIR}/boltzgen_job.log"
BOLTZ_SLURM_SCRIPT="${INPUT_DIR}/boltzgen_job.slurm"

# ── Normalise protocol: "protein-redesign" is an OOD-internal marker;
#    BoltzGen CLI only knows protein-anything (redesign is handled via the
#    design: block in the YAML spec, not by a separate protocol flag).
BOLTZ_PROTOCOL_ARG="${BOLTZ_PROTOCOL}"
[ "${BOLTZ_PROTOCOL_ARG}" = "protein-redesign" ] && BOLTZ_PROTOCOL_ARG="protein-anything"

# ── Build optional flags ──────────────────────────────────────────────────
STEPS_FLAG=""
if [ "${BOLTZ_STEPS}" != "all" ]; then
    STEPS_FLAG="--steps ${BOLTZ_STEPS}"
fi

REUSE_FLAG=""
if [ "${BOLTZ_REUSE}" = "1" ]; then
    REUSE_FLAG="--reuse"
fi

# ── Generate SLURM job script ─────────────────────────────────────────────
cat > "${BOLTZ_SLURM_SCRIPT}" << EOF
#!/bin/bash
#SBATCH --job-name=boltzgen
#SBATCH --nodes=1
#SBATCH --ntasks=8
#SBATCH --mem=64G
#SBATCH --gpus=1
#SBATCH --constraint=v100|a100
#SBATCH --time=24:00:00
#SBATCH --partition=standard
#SBATCH --account=${ACCOUNT}
#SBATCH --output=${BOLTZ_LOG_FILE}

# BoltzGen via Singularity
singularity exec --cleanenv --nv --no-home \\
    -B "${INPUT_DIR}":/input \\
    -B "${STRUCT}":/output \\
    -B "${BOLTZ_MODEL_DIR}":/models \\
    --env HF_HOME=/models \\
    --env HOME=/tmp \\
    --env XDG_CACHE_HOME=/tmp/.cache \\
    --env TRITON_CACHE_DIR=/tmp/.triton \\
    --env NUMBA_CACHE_DIR=/tmp/numba_cache \\
    --env MPLCONFIGDIR=/tmp/matplotlib \\
    "${BOLTZ_SIF}" \\
    boltzgen run /input/design_spec.yaml \\
        --output /output \\
        --protocol "${BOLTZ_PROTOCOL_ARG}" \\
        --num_designs "${BOLTZ_NUM_DESIGNS}" \\
        --budget "${BOLTZ_BUDGET}" \\
        --cache /models \\
        ${REUSE_FLAG} \\
        ${STEPS_FLAG}
EOF

chmod +x "${BOLTZ_SLURM_SCRIPT}"

# ── Submit ────────────────────────────────────────────────────────────────
BOLTZ_JOB_ID=$(sbatch "${BOLTZ_SLURM_SCRIPT}" | awk '{print $4}')
export BOLTZ_JOB_ID
echo "BoltzGen job submitted: ${BOLTZ_JOB_ID}"
