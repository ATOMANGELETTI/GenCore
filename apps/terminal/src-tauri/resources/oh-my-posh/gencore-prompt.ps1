if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
  try {
    $ErrorActionPreference = 'SilentlyContinue'
    oh-my-posh init pwsh --config $env:POSH_THEME | Invoke-Expression
  } finally {
    $ErrorActionPreference = 'Continue'
  }
  $gencoreInner = $function:Prompt
  function Global:Prompt {
    $cwd = (Get-Location).Path
    [Console]::Write("$([char]27)]7;file:///$($cwd.Replace('\','/'))$([char]7)")
    & $gencoreInner
  }
} else {
  function Global:Prompt { "$([char]0x276F) " }
}
