# Protein Design Suite — Open OnDemand Application

A unified web interface for GPU-accelerated protein design on HPC clusters, supporting two complementary tools: **RFdiffusion** for diffusion-based de novo design and **BoltzGen** for universal binder design.

---

## Supported Tools

### RFdiffusion
Diffusion-based protein design from the Baker Lab (University of Washington). Generates novel protein structures from scratch or guided by structural constraints.

**Design Modes:**
| Mode | Description |
|------|-------------|
| **Binder Design** | Design a protein/peptide to bind a target protein via hotspot residues |
| **Motif Scaffolding** | Embed a functional motif (e.g., active site) into a stable new scaffold |
| **Partial Diffusion** | Add controlled diversity to an existing structure |
| **Unconditional Generation** | Generate novel proteins of a specified length with no constraints |
| **Symmetric Design** | Design homo-oligomers with cyclic (C2–C6), dihedral (D2/D3), or higher symmetry |

**Key Parameters (auto-handled by the form):**
- `contigmap.contigs` — structural constraint map
- `ppi.hotspot_res` — target residues to drive binding
- `denoiser.noise_scale_ca / frame` — quality vs. diversity trade-off
- `diffuser.partial_T` — noise level for partial diffusion
- `inference.symmetry` — oligomer symmetry type
- `inference.ckpt_override_path` — select Active Site model for sparse motifs

---

### BoltzGen
Universal binder design from the Stark Lab. Runs a full design pipeline: backbone diffusion → inverse folding → refolding → analysis → filtering.

**Protocols:**
| Protocol | Description |
|----------|-------------|
| **protein-anything** | Design a protein binder to bind a target protein or peptide |
| **peptide-anything** | Design a cyclic or linear peptide binder |
| **protein-small_molecule** | Design a protein to bind a small molecule (CCD or SMILES) |
| **nanobody-anything** | Design nanobody CDRs against a target |
| **antibody-anything** | Design antibody CDRs against a target |
| **protein-redesign** | Redesign or optimize residues in an existing protein structure |

**Key Parameters:**
- `--protocol` — design protocol (see above)
- `--num_designs` — intermediate designs to generate (50 to test; 10,000–60,000 for production)
- `--budget` — final diversity-optimized set size
- `--steps` — run specific pipeline steps only (e.g., re-run filtering)
- `--reuse` — resume an interrupted run

**Pipeline Steps (in order):**
1. `design` — backbone diffusion
2. `inverse_folding` — sequence design onto backbone
3. `folding` — re-fold with target (Boltz-2)
4. `design_folding` — re-fold binder alone (protein protocols)
5. `affinity` — binding affinity prediction (small molecule protocols)
6. `analysis` — compute quality metrics
7. `filtering` — rank and select final designs

---

## System Requirements

| Requirement | RFdiffusion | BoltzGen |
|-------------|------------|----------|
| GPU | NVIDIA A100/V100 | NVIDIA A100 (recommended) |
| GPU Memory | 40GB+ | 40GB+ |
| RAM | 60GB | 64GB |
| Temp Storage | 50GB+ | 100GB+ (models ~6GB) |
| Container | `rfdiffusion_x86.sif` | `boltzgen_x86.sif` |
| Container Runtime | Singularity / Apptainer | Singularity / Apptainer |

---

## Container Setup

All container definition files, build scripts, and pre-built container instructions are maintained in the **[EpiGenomicsCode/ProteinDesign-Containers](https://github.com/EpiGenomicsCode/ProteinDesign-Containers)** repository.

Choose a shared directory accessible from all compute nodes (e.g. a group storage path or scratch space) and place both SIF files and the BoltzGen model weights there:

```
<container_dir>/
├── rfdiffusion_x86.sif    # RFdiffusion (models baked in at build time)
├── boltzgen_x86.sif       # BoltzGen runtime
└── boltzgen_models/       # BoltzGen weights (~6GB, downloaded separately)
```

Update `template/rfdiffusion_env.sh` to point `CONTAINER_BASE` at your chosen directory.

### Option 1 — Pull pre-built containers from Sylabs Cloud (recommended)

```bash
cd <container_dir>

# Optionally verify container authenticity first:
# singularity key import keys/mypublic.pem
# (keys/mypublic.pem is in the ProteinDesign-Containers repo)

# RFdiffusion — model weights are baked into the image, nothing extra to download
singularity pull --arch amd64 rfdiffusion_x86.sif \
    library://rfdiffusion/repo/rfdiffusion:amd64

# BoltzGen
singularity pull boltzgen_x86.sif \
    library://boltzgen/default/boltzgen_x86:latest
```

### Option 2 — Build from definition files

Clone the container repository and use the provided SLURM build script:

```bash
git clone https://github.com/EpiGenomicsCode/ProteinDesign-Containers.git
cd ProteinDesign-Containers

# Edit build_container.slurm to set your partition and account, then:
sbatch build_container.slurm rfdiffusion x86 <container_dir>
sbatch build_container.slurm boltzgen    x86 <container_dir>
```

See the [ProteinDesign-Containers README](https://github.com/EpiGenomicsCode/ProteinDesign-Containers) for full build instructions and troubleshooting.

### Downloading BoltzGen model weights

Run once after the BoltzGen SIF is available:

```bash
cd <container_dir>
mkdir -p boltzgen_models

singularity exec --cleanenv --no-home \
    -B ./boltzgen_models:/models \
    --env HF_HOME=/models --env HOME=/tmp \
    boltzgen_x86.sif boltzgen download all
```

---

## Usage — Web Interface

1. Access the Open OnDemand portal
2. Navigate to **"Protein Design Suite"**
3. Select **Application**: RFdiffusion or BoltzGen
4. Fill in the mode/protocol-specific fields (the form shows only relevant options)
5. Submit — the job runs on a GPU node via SLURM

### RFdiffusion — example binder design

The form builds the correct Hydra overrides automatically. Equivalent CLI:
```bash
singularity exec --cleanenv --nv \
  --bind inputs:/inputs --bind outputs:/outputs \
  --bind schedules:/app/RFdiffusion/schedules \
  /path/to/rfdiffusion_x86.sif \
  python3.9 /app/RFdiffusion/scripts/run_inference.py \
    inference.input_pdb=/inputs/target.pdb \
    inference.output_prefix=/outputs/design \
    inference.num_designs=10 \
    'contigmap.contigs=[A1-150/0 70-100]' \
    'ppi.hotspot_res=[A59,A83,A91]' \
    denoiser.noise_scale_ca=0 \
    denoiser.noise_scale_frame=0
```

### BoltzGen — example protein binder

The form generates the design YAML and builds the command automatically. Equivalent CLI:
```bash
# design_spec.yaml
# entities:
#   - protein: {id: B, sequence: 70..100}
#   - file: {path: target.pdb, include: [{chain: {id: A}}],
#             binding_types: [{chain: {id: A, binding: "59,83,91"}}]}

singularity exec --cleanenv --nv --no-home \
  -B inputs:/input -B outputs:/output -B models:/models \
  --env HF_HOME=/models --env HOME=/tmp \
  /path/to/boltzgen_x86.sif \
  boltzgen run /input/design_spec.yaml \
    --output /output \
    --protocol protein-anything \
    --num_designs 100 \
    --budget 10 \
    --cache /models
```

---

## Output Structure

```
working_dir/ppTIMESTAMP/
├── input/
│   ├── input.pdb              # (RFdiffusion) staged target PDB
│   ├── design_spec.yaml       # (BoltzGen) generated design specification
│   ├── target.*               # (BoltzGen) staged target structure
│   └── *_job.slurm            # submitted SLURM script
├── structure/                 # all output files
│   │── *.pdb / *.cif          # (RFdiffusion) generated structures
│   ├── intermediate_designs/  # (BoltzGen) backbone designs
│   ├── intermediate_designs_inverse_folded/
│   ├── final_ranked_designs/  # (BoltzGen) filtered, ranked output
│   └── ...
└── logs/
    ├── diffusion_job.log      # (RFdiffusion)
    └── boltzgen_job.log       # (BoltzGen)
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| RFdiffusion: `No such file: /app/RFdiffusion/models` | Old path passed | Do not pass `inference.model_directory_path` — models are in site-packages |
| RFdiffusion: Hydra config error | Wrong working dir | Ensure `python3.9 /app/RFdiffusion/scripts/run_inference.py` (full path) |
| BoltzGen: `SIF not found` | Missing container | Pull `boltzgen_x86.sif` and set `BOLTZ_SIF` path |
| BoltzGen: model download error | Empty `boltzgen_models/` | Run `boltzgen download all` via the SIF |
| GPU OOM | Too many designs in one batch | Reduce `--diffusion_batch_size` |
| Job pending indefinitely | No GPU allocation | Verify `auto_accounts` has GPU access |
| BoltzGen: interrupted run | Network/timeout | Re-submit with **"Resume Previous Run"** checked |

---

## Architecture

```
form.yml.erb        ← OOD form definition, data-hide-* for dynamic fields
form.js             ← injects mode/protocol-specific fields, validation
template/
  before.sh.erb     ← builds Hydra overrides (RF) or design YAML (BoltzGen)
  rfdiffusion_env.sh← container paths, run dirs  ← edit CONTAINER_BASE here
  rfdiffusion.sh    ← generates + submits RFdiffusion SLURM job
  boltzgen.sh       ← generates + submits BoltzGen SLURM job
```

Container definitions and build tooling:
**[EpiGenomicsCode/ProteinDesign-Containers](https://github.com/EpiGenomicsCode/ProteinDesign-Containers)**

---

## License
MIT License

## Citation

**RFdiffusion:**
> Watson et al. (2023). De novo design of protein structure and function with RFdiffusion. *Nature*, 620, 1089–1100.

**BoltzGen:**
> Stark et al. (2025). BoltzGen: Toward Universal Binder Design. *bioRxiv*.

## Acknowledgements
This project is generously funded by Cornell University BRC Epigenomics Core Facility (RRID:SCR_021287), Penn State Institute for Computational and Data Sciences (RRID:SCR_025154), and Penn State University Center for Applications of Artificial Intelligence and Machine Learning to Industry Core Facility / AIMI (RRID:SCR_022867). Computational support provided by NSF ACCESS through BIO230041.

## Contact
- Technical Support: [icds-help@psu.edu](mailto:icds-help@psu.edu)
- Application Maintainer: [vvm5242@psu.edu](mailto:vvm5242@psu.edu)
