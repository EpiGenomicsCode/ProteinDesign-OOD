#!/bin/bash

export PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python

export RUN_DIR="${WORKINGDIR}/pp${CREATED_AT}"
export STATUS_FILE="status.json"

export INPUT_DIR="${RUN_DIR}/input"
export STRUCT="${RUN_DIR}/structure"
export LOGDIR="${RUN_DIR}/logs"

# ── Shared base path ─────────────────────────────────────────────────────
export CONTAINER_BASE="/storage/group/aimi/alphafold/vvm5242/ProtDesignTemp"

# ── RFdiffusion paths ─────────────────────────────────────────────────────
# Models are BAKED INTO the container (Python site-packages) — no separate model dir needed
# Pulled via: singularity pull --arch amd64 library://rfdiffusion/repo/rfdiffusion:amd64
export DIFFUSION_SIF="${CONTAINER_BASE}/rfdiffusion_x86.sif"

# ── BoltzGen paths ────────────────────────────────────────────────────────
# Models downloaded separately into boltzgen_models/ bound at runtime to /models
# Pulled via: singularity pull library://boltzgen/default/boltzgen_x86:latest
export BOLTZ_SIF="${CONTAINER_BASE}/boltzgen_x86.sif"
export BOLTZ_MODEL_DIR="${CONTAINER_BASE}/boltzgen_models"
