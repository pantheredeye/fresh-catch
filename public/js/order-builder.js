// Order-builder island (bead #104, decision C3 pattern — hand-written ES
// module in public/js/, same reasoning as favorites.js / catch-record.js).
// Progressive enhancement over the no-JS row builder (#103): the server's
// "Add another fish" / "Remove" submit buttons are intercepted and become
// client-side row operations — no round trip, typed values untouched. Rows
// are renumbered to exactly what the no-JS form would have rendered
// (`items[i].*` names, `items-i-*` ids, "Fish N" legends), so the server
// parser and ErrorSummary anchors see no difference at submit.
(() => {
  const form = document.querySelector("form.request-form");
  const rows = document.getElementById("builder-rows");
  const template = document.getElementById("builder-row-template");
  if (!form || !rows || !template) return;
  const addButton = form.querySelector('button[value="add-row"]');
  const maxItems = Number(rows.dataset.maxItems) || 8;

  function rowList() {
    return [...rows.querySelectorAll("fieldset.item-row")];
  }

  // `items[3].species` → id `items-3-species`, plus the label's `for` and the
  // helper/error <p> ids the control's aria-describedby points at.
  function renumberField(row, control, index) {
    const match = control.name.match(/^items\[\d+\]\.(\w+)$/);
    if (!match) return;
    control.name = `items[${index}].${match[1]}`;
    const oldId = control.id;
    const newId = `items-${index}-${match[1]}`;
    if (oldId === newId) return;
    control.id = newId;
    const label = row.querySelector(`label[for="${oldId}"]`);
    if (label) label.setAttribute("for", newId);
    for (const suffix of ["helper", "error"]) {
      const note = row.querySelector(`[id="${oldId}-${suffix}"]`);
      if (note) note.id = `${newId}-${suffix}`;
    }
    const describedBy = control.getAttribute("aria-describedby");
    if (describedBy) control.setAttribute("aria-describedby", describedBy.replace(oldId, newId));
  }

  // Also reasserts the edge states after every add/remove: the sole row's
  // Remove and the at-cap Add are `hidden`, mirroring the no-JS render.
  function renumber() {
    const list = rowList();
    list.forEach((row, index) => {
      row.querySelector("legend").textContent = `Fish ${index + 1}`;
      row.querySelectorAll("select, input, textarea").forEach((control) => renumberField(row, control, index));
      const removeButton = row.querySelector('button[name="action"]');
      if (removeButton) {
        removeButton.value = `remove-${index}`;
        removeButton.setAttribute("aria-label", `Remove fish ${index + 1}`);
        removeButton.hidden = list.length === 1;
      }
    });
    if (addButton) addButton.hidden = list.length >= maxItems;
  }

  function addRow() {
    if (rowList().length >= maxItems) return;
    rows.appendChild(template.content.cloneNode(true));
    renumber();
    const list = rowList();
    list[list.length - 1].querySelector("select, input").focus();
  }

  function removeRow(button) {
    const list = rowList();
    if (list.length <= 1) return;
    const row = button.closest("fieldset.item-row");
    const index = list.indexOf(row);
    row.remove();
    renumber();
    const remaining = rowList();
    remaining[Math.min(index, remaining.length - 1)].querySelector("select, input").focus();
  }

  // Delegated so cloned rows' Remove buttons work without re-wiring.
  // preventDefault keeps these submit buttons from ever posting the form —
  // the action=add-row/remove-N round trip stays a no-JS-only path.
  form.addEventListener("click", (event) => {
    const button = event.target.closest('button[name="action"]');
    if (!button || !form.contains(button)) return;
    event.preventDefault();
    if (button.value === "add-row") {
      addRow();
    } else {
      removeRow(button);
    }
  });
})();
