// Mic-record island for /admin/catch (bead #57, decision C3). Hand-written
// vanilla ES module in public/js/ rather than a Vite client entry: `vite dev`
// only serves a client entry's real source path (e.g. /src/client/foo.ts),
// while `vite build` emits it under a different path (e.g. /js/foo.js) —
// reconciling the two needs an env-conditional <script src> for ~100 lines
// of untyped DOM/MediaRecorder code. Not worth the dev/prod divergence risk.
(() => {
  const micButton = document.getElementById("catch-mic-button");
  const textInput = document.getElementById("catch-text-input");
  const textSubmit = document.getElementById("catch-text-submit");
  const status = document.getElementById("catch-record-status");
  const preview = document.getElementById("catch-draft-preview");
  const draftHeadline = document.getElementById("catch-draft-headline");
  const draftItems = document.getElementById("catch-draft-items");
  const draftSummary = document.getElementById("catch-draft-summary");
  const publishSubmit = document.getElementById("catch-publish-submit");
  const publishHeadline = document.getElementById("catch-publish-headline");
  const publishSummary = document.getElementById("catch-publish-summary");
  const publishItems = document.getElementById("catch-publish-items");
  const publishTranscript = document.getElementById("catch-publish-transcript");

  if (!micButton || !textSubmit) return;

  let mediaRecorder = null;
  let chunks = [];

  function setStatus(message, isError) {
    status.textContent = message;
    status.classList.toggle("field-error", Boolean(isError));
  }

  function renderDraft(draft) {
    const { formatted, rawTranscript } = draft;
    draftHeadline.textContent = formatted.headline;
    draftSummary.textContent = formatted.summary;
    draftItems.innerHTML = "";
    for (const item of formatted.items) {
      const li = document.createElement("li");
      li.textContent = item.note ? `${item.name} — ${item.note}` : item.name;
      draftItems.appendChild(li);
    }
    preview.hidden = false;

    publishHeadline.value = formatted.headline;
    publishSummary.value = formatted.summary;
    publishItems.value = JSON.stringify(formatted.items);
    publishTranscript.value = rawTranscript;
    publishSubmit.disabled = false;
  }

  async function submitDraft(body, headers) {
    setStatus("Formatting…", false);
    publishSubmit.disabled = true;
    try {
      const res = await fetch("/admin/catch/record", { method: "POST", body, headers });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error || "Something went wrong.", true);
        return;
      }
      renderDraft(data);
      setStatus("Draft ready — review below, then publish.", false);
    } catch {
      setStatus("Network error — try again.", true);
    }
  }

  textSubmit.addEventListener("click", () => {
    const text = textInput.value.trim();
    if (!text) {
      setStatus("Type something first.", true);
      return;
    }
    submitDraft(JSON.stringify({ text }), { "Content-Type": "application/json" });
  });

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    micButton.disabled = true;
    micButton.title = "Recording isn't supported in this browser — use the text box instead.";
    return;
  }

  micButton.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => chunks.push(event.data);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
        micButton.textContent = "Start recording";
        submitDraft(blob, { "Content-Type": blob.type });
      };
      mediaRecorder.start();
      micButton.textContent = "Stop recording";
      setStatus("Recording…", false);
    } catch {
      setStatus("Microphone access denied or unavailable.", true);
    }
  });
})();
