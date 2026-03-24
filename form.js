$(document).ready(function () {
  var form = $('#new_batch_connect_session_context');
  var errorContainer = $('<div class="alert alert-danger mt-2" style="display:none;"></div>');
  form.prepend(errorContainer);

  function showError(msg) { errorContainer.text(msg).show(); }
  function hideError()    { errorContainer.hide(); }

  // ── App type change ───────────────────────────────────────────────────────
  // When switching to RFdiffusion, app_type=rfdiffusion's data-hide rules show
  // ALL mode-specific fields. We then re-trigger design_mode so its hide rules
  // suppress whichever fields don't belong to the currently selected mode.
  $('#batch_connect_session_context_app_type').on('change', function () {
    if ($(this).val() === 'rfdiffusion') {
      $('#batch_connect_session_context_design_mode').trigger('change');
    }
  });

  // ── BoltzGen protocol resync ──────────────────────────────────────────────
  // When switching back to BoltzGen, OOD's data-hide for app_type hides all
  // mode fields. Protocol sub-fields are controlled by boltz_protocol natively.
  // No extra JS needed — OOD handles it.

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
      if (!$('#batch_connect_session_context_pdb_structure').val()) {
        showError('A target PDB file is required for ' + mode + ' mode.');
        return false;
      }
    }

    if (mode === 'binder') {
      var bMin = parseInt($('#batch_connect_session_context_binder_length_min').val(), 10);
      var bMax = parseInt($('#batch_connect_session_context_binder_length_max').val(), 10);
      if (bMin > bMax) {
        showError('Binder min length must be \u2264 max length.');
        return false;
      }
      if (!$('#batch_connect_session_context_target_chain').val()) {
        showError('Target Chain ID is required for Binder Design mode.');
        return false;
      }
    }

    if (mode === 'scaffold') {
      if (!$('#batch_connect_session_context_motif_chain').val()) {
        showError('Motif Chain ID is required for Motif Scaffolding mode.');
        return false;
      }
      var mStart = parseInt($('#batch_connect_session_context_motif_res_start').val(), 10);
      var mEnd   = parseInt($('#batch_connect_session_context_motif_res_end').val(), 10);
      if (mStart > mEnd) {
        showError('Motif start residue must be \u2264 end residue.');
        return false;
      }
    }

    if (mode === 'unconditional') {
      var lMin = parseInt($('#batch_connect_session_context_length_min').val(), 10);
      var lMax = parseInt($('#batch_connect_session_context_length_max').val(), 10);
      if (lMin > lMax) {
        showError('Protein min length must be \u2264 max length.');
        return false;
      }
    }

    return true;
  }

  function validateBoltzGen() {
    var protocol   = $('#batch_connect_session_context_boltz_protocol').val();
    var isSmallMol = protocol === 'protein-small_molecule';

    if (!isSmallMol) {
      if (!$('#batch_connect_session_context_boltz_target_file').val()) {
        showError('A target structure file is required for the selected protocol.');
        return false;
      }
    }

    if (isSmallMol) {
      if (!$('#batch_connect_session_context_boltz_small_mol_id').val()) {
        showError('A small molecule identifier (CCD code or SMILES) is required.');
        return false;
      }
    }

    if (protocol !== 'protein-redesign') {
      var minLen = parseInt($('#batch_connect_session_context_boltz_binder_length_min').val(), 10);
      var maxLen = parseInt($('#batch_connect_session_context_boltz_binder_length_max').val(), 10);
      if (minLen > maxLen) {
        showError('Binder min length must be \u2264 max length.');
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
});
