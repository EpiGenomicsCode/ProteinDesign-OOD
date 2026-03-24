$(document).ready(function () {
  var form = $('#new_batch_connect_session_context');
  var errorContainer = $('<div class="alert alert-danger mt-2" style="display:none;"></div>');
  var rfModeOptions = $('<div id="rfdiff-mode-options"></div>');

  form.prepend(errorContainer);
  // Inject the RFdiffusion mode-specific dynamic fields right after design_mode
  $('#batch_connect_session_context_design_mode').closest('.form-group').after(rfModeOptions);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function showError(msg) { errorContainer.text(msg).show(); }
  function hideError()    { errorContainer.hide(); }

  function formGroup(fieldName) {
    return $('#batch_connect_session_context_' + fieldName).closest('.form-group');
  }

  // ── Dynamic RFdiffusion mode-specific fields ──────────────────────────────
  // These DOM elements don't exist in form.yml.erb so OOD data-hide can't
  // manage them; we build and inject them when the design mode changes.

  function makeInput(name, label, help, attrs) {
    var g = $('<div class="form-group"></div>');
    g.append($('<label class="control-label"></label>').text(label));
    g.append(
      $('<input class="form-control">')
        .attr('name', 'batch_connect_session_context[' + name + ']')
        .attr(attrs || {})
    );
    g.append($('<small class="form-text text-muted"></small>').html(help));
    return g;
  }

  function makeSelect(name, label, help, options, defaultVal) {
    var g = $('<div class="form-group"></div>');
    g.append($('<label class="control-label"></label>').text(label));
    var sel = $('<select class="form-control"></select>')
      .attr('name', 'batch_connect_session_context[' + name + ']');
    options.forEach(function (o) {
      var opt = $('<option>').val(o[1]).text(o[0]);
      if (defaultVal !== undefined && o[1] === defaultVal) opt.prop('selected', true);
      sel.append(opt);
    });
    g.append(sel);
    g.append($('<small class="form-text text-muted"></small>').html(help));
    return g;
  }

  function makeCheckbox(name, label, help) {
    var g = $('<div class="form-group"></div>');
    var wrap = $('<div class="checkbox"></div>');
    var lbl  = $('<label></label>');
    var cb   = $('<input type="checkbox" class="check_box">')
      .attr('name', 'batch_connect_session_context[' + name + ']')
      .val('1');
    lbl.append(cb).append(' ' + label);
    wrap.append(lbl);
    g.append(wrap);
    g.append($('<small class="form-text text-muted"></small>').html(help));
    return g;
  }

  function makeHr(title) {
    return $('<div class="mt-3 mb-2"><small class="text-muted font-weight-bold text-uppercase">' + title + '</small><hr class="mt-1 mb-2"></div>');
  }

  // ── Binder Design (PPI) ───────────────────────────────────────────────────
  // Contig built as: [CHAIN_START-CHAIN_END/0 BINDER_MIN-BINDER_MAX]
  // Example from RFdiffusion docs: 'contigmap.contigs=[A1-150/0 70-100]'
  function buildBinderOptions() {
    rfModeOptions.append(
      makeHr('Target Protein'),
      makeInput('target_chain', 'Target Chain ID',
        'Chain letter in your PDB for the target protein (e.g. <code>A</code>).',
        { type: 'text', required: true, placeholder: 'e.g. A', maxlength: 5 }),
      makeInput('target_res_range', 'Target Residue Range <small class="text-muted">(optional)</small>',
        'Residues to include as target, in PDB numbering (e.g. <code>1-150</code>). Leave blank to use the entire chain.',
        { type: 'text', placeholder: 'e.g. 1-150' }),
      makeInput('hotspot_res', 'Hotspot Residues <small class="text-muted">(strongly recommended)</small>',
        'Key residues on the target that should drive binding — chain letter + residue number, comma-separated (e.g. <code>A59,A83,A91</code>). Omitting hotspots significantly reduces success rate.',
        { type: 'text', placeholder: 'e.g. A59,A83,A91' }),

      makeHr('Designed Binder'),
      makeInput('binder_length_min', 'Binder Min Length (residues)',
        'Minimum length of the designed binder. Typical range: 50–150.',
        { type: 'number', min: 20, max: 400, value: 70, required: true }),
      makeInput('binder_length_max', 'Binder Max Length (residues)',
        'Maximum length (exact length is randomly sampled each design).',
        { type: 'number', min: 20, max: 400, value: 100, required: true }),

      makeHr('Quality Settings'),
      makeSelect('noise_scale', 'Noise Scale',
        'Lower noise improves design quality at the cost of diversity. <strong>Recommended: Zero noise</strong> for binder design.',
        [
          ['Zero noise — maximum quality (recommended)', '0'],
          ['Reduced noise — balanced (0.5)', '0.5'],
          ['Standard noise — maximum diversity (1.0)', '1.0']
        ], '0')
    );
  }

  // ── Motif Scaffolding ─────────────────────────────────────────────────────
  // Contig built as: [NMIN-NMAX/CHAIN_START-MOTIF_END/CMIN-CMAX]
  // Example: 'contigmap.contigs=[10-40/A163-181/10-40]'
  function buildScaffoldOptions() {
    rfModeOptions.append(
      makeHr('Motif Definition'),
      makeInput('motif_chain', 'Motif Chain ID',
        'Chain letter containing the functional motif to preserve (e.g. <code>A</code>).',
        { type: 'text', required: true, placeholder: 'e.g. A', maxlength: 5 }),
      makeInput('motif_res_start', 'Motif Start Residue',
        'First residue of the motif in PDB numbering (e.g. <code>163</code>).',
        { type: 'number', required: true, min: 1, placeholder: 'e.g. 163' }),
      makeInput('motif_res_end', 'Motif End Residue',
        'Last residue of the motif, inclusive (e.g. <code>181</code>).',
        { type: 'number', required: true, min: 1, placeholder: 'e.g. 181' }),

      makeHr('Scaffold Flanking Lengths'),
      makeInput('nterm_min', 'N-terminal Min (residues)',
        'Minimum designed residues before the motif.',
        { type: 'number', min: 0, max: 300, value: 10 }),
      makeInput('nterm_max', 'N-terminal Max (residues)',
        'Maximum designed residues before the motif.',
        { type: 'number', min: 0, max: 300, value: 40 }),
      makeInput('cterm_min', 'C-terminal Min (residues)',
        'Minimum designed residues after the motif.',
        { type: 'number', min: 0, max: 300, value: 10 }),
      makeInput('cterm_max', 'C-terminal Max (residues)',
        'Maximum designed residues after the motif.',
        { type: 'number', min: 0, max: 300, value: 40 }),

      makeHr('Model'),
      makeSelect('scaffold_model', 'Checkpoint',
        'Use <strong>Active Site</strong> for tiny/sparse motifs (1–3 residues or catalytic triads). Use <strong>Standard</strong> for larger contiguous motifs.',
        [
          ['Standard — for contiguous motifs (Base model)', 'base'],
          ['Active Site — for small/sparse catalytic motifs', 'active_site']
        ], 'base')
    );
  }

  // ── Partial Diffusion ─────────────────────────────────────────────────────
  // Contig must equal total structure length: [LEN-LEN]
  // Example: 'contigmap.contigs=[79-79]' diffuser.partial_T=10
  function buildPartialOptions() {
    rfModeOptions.append(
      makeHr('Structure to Noise'),
      makeInput('struct_length', 'Total Structure Length (residues)',
        'Total residue count in your input PDB (all chains combined). <strong>This must match exactly.</strong> Open your PDB in a viewer and count residues, or run <code>grep -c "^ATOM" yourfile.pdb</code>.',
        { type: 'number', required: true, min: 1, placeholder: 'e.g. 79' }),

      makeHr('Noise Level'),
      makeInput('partial_T', 'Noise Steps',
        'How many diffusion steps to apply (1–50). Lower = more conservative changes, closer to input. ' +
        'Recommended: <strong>10</strong> (~20% noise, generates subtle diversity). ' +
        'Use 20–40 for larger changes. Must be ≤ 50 (model default T).',
        { type: 'number', min: 1, max: 50, value: 10, required: true })
    );
  }

  // ── Unconditional Generation ──────────────────────────────────────────────
  // Contig: [MIN-MAX]  — no input PDB
  // Example: 'contigmap.contigs=[100-200]'
  function buildUnconditionalOptions() {
    rfModeOptions.append(
      makeHr('Protein Length'),
      makeInput('length_min', 'Min Protein Length (residues)',
        'Minimum length of the generated protein.',
        { type: 'number', min: 50, max: 800, value: 100, required: true }),
      makeInput('length_max', 'Max Protein Length (residues)',
        'Maximum length (exact length is randomly sampled each design). Proteins up to ~300 residues are typical.',
        { type: 'number', min: 50, max: 800, value: 200, required: true })
    );
  }

  // ── Symmetric Oligomers ───────────────────────────────────────────────────
  // Uses --config-name symmetry + inference.symmetry=C6 + contigmap.contigs=[480-480]
  // Example: inference.symmetry="C6" 'contigmap.contigs=[480-480]'
  function buildSymmetricOptions() {
    rfModeOptions.append(
      makeHr('Symmetry'),
      makeSelect('symmetry', 'Symmetry Type',
        'The cyclic (Cn) or dihedral (Dn) symmetry of the designed oligomer. Tetrahedral/Octahedral/Icosahedral generate 12/24/60-mers.',
        [
          ['C2 — homodimer (2-fold)', 'C2'],
          ['C3 — homotrimer (3-fold)', 'C3'],
          ['C4 — homotetramer (4-fold)', 'C4'],
          ['C5 — homopentamer (5-fold)', 'C5'],
          ['C6 — homohexamer (6-fold)', 'C6'],
          ['D2 — dihedral (4 chains)', 'D2'],
          ['D3 — dihedral (6 chains)', 'D3'],
          ['Tetrahedral (12 chains)', 'tetrahedral'],
          ['Octahedral (24 chains)', 'octahedral'],
          ['Icosahedral (60 chains)', 'icosahedral']
        ], 'C3'),

      makeHr('Assembly Size'),
      makeInput('sym_total_length', 'Total Assembly Length (residues)',
        'Total residues across <em>all subunits combined</em>. Must be evenly divisible by the number of chains. ' +
        'E.g. for C6 with 80 residues per chain: enter <code>480</code>.',
        { type: 'number', min: 50, max: 10000, value: 300, required: true }),

      makeHr('Potentials'),
      makeCheckbox('use_olig_contacts', 'Apply oligomer contact potential (recommended)',
        'Guides chains to form both intra- and inter-chain contacts during diffusion. Strongly recommended for oligomer design.')
    );
  }

  function refreshRFModeOptions() {
    rfModeOptions.empty();
    var mode = $('#batch_connect_session_context_design_mode').val();
    if      (mode === 'binder')       buildBinderOptions();
    else if (mode === 'scaffold')     buildScaffoldOptions();
    else if (mode === 'partial')      buildPartialOptions();
    else if (mode === 'unconditional') buildUnconditionalOptions();
    else if (mode === 'symmetric')    buildSymmetricOptions();
  }

  // ── Re-sync BoltzGen protocol sub-fields ─────────────────────────────────
  // OOD's native data-hide handles most cases, but when the user switches
  // from RFdiffusion back to BoltzGen the protocol select's data-hide rules
  // don't automatically re-fire. We trigger a change to force re-evaluation.

  function resyncBoltzProtocol() {
    $('#batch_connect_session_context_boltz_protocol').trigger('change');
  }

  // ── Event bindings ────────────────────────────────────────────────────────
  $('#batch_connect_session_context_app_type').on('change', function () {
    var appType = $(this).val();
    if (appType === 'rfdiffusion') {
      refreshRFModeOptions();
      // Restore pdb_structure visibility (design_mode will control it)
      formGroup('pdb_structure').show();
    } else {
      rfModeOptions.empty();   // clear any injected RF fields
      resyncBoltzProtocol();   // re-apply protocol data-hide rules
      // Force-hide pdb_structure: design_mode's data-hide rules would
      // otherwise keep it visible even when BoltzGen is selected.
      formGroup('pdb_structure').hide();
    }
  });

  $('#batch_connect_session_context_design_mode').on('change', refreshRFModeOptions);

  // ── Form validation ───────────────────────────────────────────────────────
  form.on('submit', function (e) {
    hideError();
    var appType = $('#batch_connect_session_context_app_type').val();

    if (appType === 'rfdiffusion') {
      if (!validateRFdiffusion()) { e.preventDefault(); scrollToError(); }
    } else {
      if (!validateBoltzGen())    { e.preventDefault(); scrollToError(); }
    }
  });

  function scrollToError() {
    $('html, body').animate({ scrollTop: errorContainer.offset().top - 20 }, 250);
  }

  function validateRFdiffusion() {
    var mode = $('#batch_connect_session_context_design_mode').val();

    if (mode !== 'unconditional') {
      var pdb = $('#batch_connect_session_context_pdb_structure').val();
      if (!pdb) {
        showError('A target PDB file is required for ' + mode + ' mode.');
        return false;
      }
    }

    var numDesigns = parseInt($('#batch_connect_session_context_num_designs').val(), 10);
    if (!numDesigns || numDesigns < 1) {
      showError('Number of designs is required.');
      return false;
    }

    // Validate mode-specific required fields
    var allRequired = rfModeOptions.find('[required]');
    var ok = true;
    allRequired.each(function () {
      if (!$(this).val()) { ok = false; return false; }
    });
    if (!ok) {
      showError('Please fill in all required fields for the selected design mode.');
      return false;
    }

    // Mode-specific cross-field checks
    if (mode === 'binder') {
      var bMin = parseInt($('input[name="batch_connect_session_context[binder_length_min]"]').val(), 10);
      var bMax = parseInt($('input[name="batch_connect_session_context[binder_length_max]"]').val(), 10);
      if (bMin > bMax) {
        showError('Binder min length must be ≤ max length.');
        return false;
      }
    }

    if (mode === 'unconditional') {
      var lMin = parseInt($('input[name="batch_connect_session_context[length_min]"]').val(), 10);
      var lMax = parseInt($('input[name="batch_connect_session_context[length_max]"]').val(), 10);
      if (lMin > lMax) {
        showError('Protein min length must be ≤ max length.');
        return false;
      }
    }

    if (mode === 'scaffold') {
      var mStart = parseInt($('input[name="batch_connect_session_context[motif_res_start]"]').val(), 10);
      var mEnd   = parseInt($('input[name="batch_connect_session_context[motif_res_end]"]').val(), 10);
      if (mStart > mEnd) {
        showError('Motif start residue must be ≤ end residue.');
        return false;
      }
    }

    return true;
  }

  function validateBoltzGen() {
    var protocol  = $('#batch_connect_session_context_boltz_protocol').val();
    var isSmallMol = protocol === 'protein-small_molecule';

    if (!isSmallMol) {
      var target = $('#batch_connect_session_context_boltz_target_file').val();
      if (!target) {
        showError('A target structure file is required for the selected protocol.');
        return false;
      }
    }

    if (isSmallMol) {
      var molId = $('#batch_connect_session_context_boltz_small_mol_id').val();
      if (!molId) {
        showError('A small molecule identifier (CCD code or SMILES) is required for the protein-small_molecule protocol.');
        return false;
      }
    }

    if (protocol !== 'protein-redesign') {
      var minLen = parseInt($('#batch_connect_session_context_boltz_binder_length_min').val(), 10);
      var maxLen = parseInt($('#batch_connect_session_context_boltz_binder_length_max').val(), 10);
      if (minLen > maxLen) {
        showError('Binder min length must be ≤ max length.');
        return false;
      }
    }

    var numDesigns = parseInt($('#batch_connect_session_context_boltz_num_designs').val(), 10);
    var budget     = parseInt($('#batch_connect_session_context_boltz_budget').val(), 10);
    if (budget > numDesigns) {
      showError('Final design budget cannot exceed the number of intermediate designs.');
      return false;
    }

    return true;
  }

  // ── Initialise on page load ───────────────────────────────────────────────
  // OOD native data-hide handles show/hide from the default select values.
  // We only need to inject mode-specific fields for RFdiffusion if it's selected.
  var initialApp = $('#batch_connect_session_context_app_type').val();
  if (initialApp === 'rfdiffusion') {
    refreshRFModeOptions();
  } else {
    rfModeOptions.empty();
    resyncBoltzProtocol();
    formGroup('pdb_structure').hide();
  }
});
