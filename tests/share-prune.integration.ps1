$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$source=[IO.File]::ReadAllText((Join-Path $root 'server/local-server.ps1'))
$start=$source.IndexOf('function PrunePreviousImports(')
$end=$source.IndexOf('function Reply(', $start)
$utf8=New-Object Text.UTF8Encoding($false)
Invoke-Expression $source.Substring($start,$end-$start)
$path=Join-Path $env:TEMP ('fee-share-prune-'+[guid]::NewGuid().ToString('N')+'.json')
try {
  $old=@{state=@{works=@(@{id='share';type='视频';transferId='r'},@{id='source';type='活动拍摄';sourceFile='来源.xlsx'},@{id='manual';type='视频'});transferRecords=@(@{id='r';addedMemberIds=@('new')});videoImportRecords=@(@{id='source-r'});importRecords=@();rosters=@{'2026-06'=@(@{id='new'},@{id='original'})}}}
  $current=@{works=@(@{id='manual';type='视频'});transferRecords=@();videoImportRecords=@();importRecords=@();rosters=@{'2026-06'=@(@{id='original'})}}
  [IO.File]::WriteAllText($path+'.previous',($old|ConvertTo-Json -Depth 20),$utf8)
  PrunePreviousImports $path $current
  $result=([IO.File]::ReadAllText($path+'.previous')|ConvertFrom-Json).state
  if(@($result.works).Count -ne 1 -or $result.works[0].id -ne 'manual'){throw 'Deleted transfer/source projects remain in recovery file'}
  if(@($result.transferRecords).Count -or @($result.videoImportRecords).Count){throw 'Deleted import records remain'}
  if(@($result.rosters.'2026-06').Count -ne 1){throw 'Imported member remains'}
  Write-Output 'Share deletion also cleans recovery metadata; unrelated manual data retained.'
} finally { if([IO.File]::Exists($path+'.previous')){Remove-Item -LiteralPath ($path+'.previous')} }
