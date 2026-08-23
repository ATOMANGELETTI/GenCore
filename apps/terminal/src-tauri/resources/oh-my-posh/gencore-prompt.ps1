if (Get-Command oh-my-posh -ErrorAction SilentlyContinue) {
  try {
    $ErrorActionPreference = 'SilentlyContinue'
    oh-my-posh init pwsh --config $env:POSH_THEME | Invoke-Expression
  } finally {
    $ErrorActionPreference = 'Continue'
  }
  $gencoreInner = (Get-Command -Name 'prompt' -CommandType Function -ErrorAction SilentlyContinue).ScriptBlock
  function Global:Prompt {
    $cwd = (Get-Location).Path
    [Console]::Write("$([char]27)]7;file:///$($cwd.Replace('\','/'))$([char]7)")
    if ($null -ne $gencoreInner) {
      & $gencoreInner
    } else {
      "$([char]0x25B6) "
    }
  }
} else {
  function Global:Prompt {
    $cwd = (Get-Location).Path
    [Console]::Write("$([char]27)]7;file:///$($cwd.Replace('\','/'))$([char]7)")
    "$([char]0x25B6) "
  }
}
