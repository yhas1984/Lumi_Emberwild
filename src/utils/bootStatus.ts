// Small on-page progress indicator for diagnosing boot issues.
// Shows a text line that updates through the boot sequence and hides
// once the main menu is reached. Turns red if an error is reported.
export function bootStatus(text: string | null): void {
  const el = document.getElementById("boot-status");
  if (!el) {
    return;
  }
  if (text === null) {
    el.style.display = "none";
    return;
  }
  el.style.display = "block";
  el.textContent = "Lumi: " + text;
}

export function bootError(text: string): void {
  const el = document.getElementById("boot-status");
  if (!el) {
    return;
  }
  el.style.display = "block";
  el.style.color = "#ff5f7a";
  el.textContent = "Lumi error: " + text;
}
