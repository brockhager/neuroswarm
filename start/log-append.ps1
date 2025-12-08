param(
  [Parameter(Mandatory=$true)][string]$Message,
  [Parameter(Mandatory=$true)][string]$Path,
  [int]$Tries = 10,
  [int]$SleepMs = 50
)

# Attempt to append with retries so concurrent writers don't fail the script.
for ($i = 0; $i -lt $Tries; $i++) {
  try {
    Add-Content -LiteralPath $Path -Value $Message -Encoding utf8 -ErrorAction Stop
    break
  } catch {
    Start-Sleep -Milliseconds $SleepMs
  }
}
