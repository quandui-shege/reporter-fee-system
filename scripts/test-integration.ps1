param([string]$NodePath='node')
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$tempRoot=[IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$qa=Join-Path $tempRoot ('reporter-fee-qa-'+[guid]::NewGuid().ToString('N'))
$processes=New-Object Collections.Generic.List[object]
function StartQA($folder){
  $p=Start-Process -FilePath powershell.exe -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $folder 'server/local-server.ps1')+'" -Serve') -WindowStyle Hidden -WorkingDirectory $tempRoot -PassThru
  $processes.Add($p)
  for($i=0;$i -lt 100;$i++){
    $runtime=Join-Path $folder '.runtime.json'
    if(Test-Path -LiteralPath $runtime){try{$info=Get-Content -LiteralPath $runtime -Raw -Encoding UTF8|ConvertFrom-Json;if($info.pid -eq $p.Id){return $info}}catch{}}
    if($p.HasExited){throw 'QA server exited before startup'}
    Start-Sleep -Milliseconds 100
  }
  throw 'QA server startup timed out'
}
function NodeTest([string[]]$arguments){& $NodePath @arguments;if($LASTEXITCODE -ne 0){throw 'Integration check failed'}}
try{
  [IO.Directory]::CreateDirectory($qa)|Out-Null
  $a=Join-Path $qa 'A';$b=Join-Path $qa 'B'
  foreach($folder in @($a,$b)){
    [IO.Directory]::CreateDirectory($folder)|Out-Null
    foreach($part in @('web','server')){Copy-Item -LiteralPath (Join-Path $root $part) -Destination $folder -Recurse}
  }
  $aInfo=StartQA $a;$bInfo=StartQA $b
  NodeTest @((Join-Path $root 'tests/release.integration.cjs'),$a,$b)
  NodeTest @((Join-Path $root 'tests/storage.test.cjs'),$aInfo.url,$a)
  NodeTest @((Join-Path $root 'tests/key-storage.integration.cjs'),$a,$b)
  $aInfo=StartQA $a
  NodeTest @((Join-Path $root 'tests/restart.integration.cjs'),$a,$b)
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tests/share-prune.integration.ps1')
  if($LASTEXITCODE -ne 0){throw 'Prune check failed'}
  Write-Output 'Release integration passed; isolated QA folders will be removed.'
}finally{
  foreach($p in $processes){if(!$p.HasExited){Stop-Process -Id $p.Id -ErrorAction SilentlyContinue}}
  $resolved=[IO.Path]::GetFullPath($qa)
  if(!$resolved.StartsWith($tempRoot,[StringComparison]::OrdinalIgnoreCase) -or !(Split-Path $resolved -Leaf).StartsWith('reporter-fee-qa-')){throw 'QA cleanup path is outside the temporary directory'}
  if(Test-Path -LiteralPath $resolved){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
