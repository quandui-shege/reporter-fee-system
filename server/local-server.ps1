param([switch]$Serve,[switch]$NoBrowser)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Split-Path $PSScriptRoot -Parent))
$webRoot=Join-Path $root 'web'
$utf8=New-Object Text.UTF8Encoding($false)
$runtime=Join-Path $root '.runtime.json'
if(!$Serve){
  if(Test-Path -LiteralPath $runtime){try{$active=Get-Content -LiteralPath $runtime -Raw -Encoding UTF8|ConvertFrom-Json;$statusUrl=([Uri]::new([Uri]$active.url,'api/status')).AbsoluteUri;$status=Invoke-RestMethod -Uri $statusUrl -TimeoutSec 2;if($status.kind -eq 'reporter-fee' -and $status.canShutdown -and $status.keyStorage -and $status.pid -eq $active.pid -and $status.root -eq $root){if(!$NoBrowser){Start-Process $active.url};exit}}catch{}}
  $child=Start-Process -FilePath powershell.exe -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -Serve') -WindowStyle Hidden -WorkingDirectory ([IO.Path]::GetTempPath()) -PassThru
  for($i=0;$i -lt 100;$i++){
    Start-Sleep -Milliseconds 100
    if(Test-Path -LiteralPath $runtime){try{$info=Get-Content -LiteralPath $runtime -Raw -Encoding UTF8 | ConvertFrom-Json;if($info.pid -eq $child.Id){if(!$NoBrowser){Start-Process $info.url};exit}}catch{}}
    if($child.HasExited){throw 'Unable to start local data service.'}
  }
  throw 'Local data service did not start.'
}
Set-Location -LiteralPath ([IO.Path]::GetTempPath())
[Environment]::CurrentDirectory=[IO.Path]::GetTempPath()
[Reflection.Assembly]::LoadWithPartialName('System.Security')|Out-Null
$data=Join-Path $root '数据'
[IO.Directory]::CreateDirectory($data)|Out-Null
foreach($folder in @('输入','输出/导出表格','输出/备份数据','周期存档')){[IO.Directory]::CreateDirectory((Join-Path $data $folder))|Out-Null}
$instanceFile=Join-Path $data '.instance'
if(!(Test-Path -LiteralPath $instanceFile)){[IO.File]::WriteAllText($instanceFile,[guid]::NewGuid().ToString(),$utf8)}
$instance=[IO.File]::ReadAllText($instanceFile)
$token=[guid]::NewGuid().ToString('N')
$listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0)
$listener.Start()
$port=$listener.LocalEndpoint.Port
$origin='http://127.0.0.1:'+ $port
$url=$origin+'/'+$token+'/index.html'
[IO.File]::WriteAllText($runtime,(@{pid=$PID;url=$url;kind='reporter-fee'}|ConvertTo-Json),$utf8)
function AtomicWrite($path,$text){$tmp=$path+'.'+[guid]::NewGuid().ToString('N')+'.tmp';[IO.File]::WriteAllText($tmp,$text,$utf8);try{if([IO.File]::Exists($path)){[IO.File]::Replace($tmp,$path,$path+'.previous')}else{[IO.File]::Move($tmp,$path)}}finally{if([IO.File]::Exists($tmp)){[IO.File]::Delete($tmp)}}}
function PrunePreviousImports($path,$currentState){
  $previous=$path+'.previous';if(![IO.File]::Exists($previous)){return}
  $old=[IO.File]::ReadAllText($previous,$utf8)|ConvertFrom-Json
  $oldState=if($old.state){$old.state}else{$old}
  $liveWorks=@{};foreach($w in @($currentState.works)){if($w -and $w.id){$liveWorks[$w.id]=$true}}
  $oldTransferMembers=@{};foreach($record in @($oldState.transferRecords)){foreach($id in @($record.addedMemberIds)){if($id){$oldTransferMembers[$id]=$true}}}
  $oldState.works=@($oldState.works|Where-Object {!(($_.type -eq '微博汇总' -or $_.transferId -or (($_.type -eq '视频' -or $_.type -eq '活动拍摄') -and $_.sourceFile)) -and !$liveWorks.ContainsKey($_.id))})
  foreach($field in @('importRecords','videoImportRecords','transferRecords')){
    $liveRecords=@{};foreach($r in @($currentState.$field)){if($r -and $r.id -and !$r.removed){$liveRecords[$r.id]=$true}}
    if($oldState.PSObject.Properties[$field]){$oldState.$field=@($oldState.$field|Where-Object {!$_.removed -and $liveRecords.ContainsKey($_.id)})}
  }
  if($oldState.PSObject.Properties['rosters']){foreach($month in @($oldState.rosters.PSObject.Properties.Name)){$members=@{};foreach($m in @($currentState.rosters.$month)){if($m -and $m.id){$members[$m.id]=$true}};$oldState.rosters.$month=@($oldState.rosters.$month|Where-Object {!$oldTransferMembers.ContainsKey($_.id) -or $members.ContainsKey($_.id)})}}
  if($oldState.PSObject.Properties['roster'] -and $oldState.periodStart){$members=@{};foreach($m in @($currentState.rosters.($oldState.periodStart))){if($m -and $m.id){$members[$m.id]=$true}};$oldState.roster=@($oldState.roster|Where-Object {$members.ContainsKey($_.id)})}
  [IO.File]::WriteAllText($previous,($old|ConvertTo-Json -Depth 100 -Compress),$utf8)
}
function Reply($context,$status,$bytes,$type){$head="HTTP/1.1 $status Response`r`nContent-Type: $type`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nConnection: close`r`n`r`n";$buffer=$utf8.GetBytes($head);$context.Stream.Write($buffer,0,$buffer.Length);$context.Stream.Write($bytes,0,$bytes.Length);$context.Client.Close()}
function ReadRequest($client){
  $stream=$client.GetStream();$stream.ReadTimeout=15000;$head=New-Object IO.MemoryStream
  $last='';while($head.Length -lt 65536){$n=$stream.ReadByte();if($n -lt 0){throw 'Empty request'};$head.WriteByte([byte]$n);$last=($last+[char]$n);if($last.Length -gt 4){$last=$last.Substring($last.Length-4)};if($last -eq "`r`n`r`n"){break}}
  $lines=[Text.Encoding]::ASCII.GetString($head.ToArray()).Split(@("`r`n"),[StringSplitOptions]::None);$parts=$lines[0].Split(' ');$headers=@{};foreach($line in $lines|Select-Object -Skip 1){$i=$line.IndexOf(':');if($i -gt 0){$headers[$line.Substring(0,$i)]=$line.Substring($i+1).Trim()}}
  if($headers['Transfer-Encoding']){throw 'Chunked uploads unsupported'}
  $length=0;if($headers['Content-Length']){$length=[long]$headers['Content-Length']};if($length -lt 0 -or $length -gt 268435456){throw 'Upload too large'}
  $body=New-Object IO.MemoryStream;$buffer=New-Object byte[] 65536;while($length -gt 0){$n=$stream.Read($buffer,0,[int][Math]::Min($length,$buffer.Length));if($n -le 0){throw 'Incomplete upload'};$body.Write($buffer,0,$n);$length-=$n};$body.Position=0
  $uri=New-Object Uri($origin+$parts[1]);$query=@{};foreach($part in $uri.Query.TrimStart('?').Split('&')){if($part){$pair=$part.Split('=',2);$query[[Uri]::UnescapeDataString($pair[0])]=[Uri]::UnescapeDataString($pair[1])}}
  return @{Client=$client;Stream=$stream;Request=@{Url=$uri;Headers=$headers;QueryString=$query;HttpMethod=$parts[0];InputStream=$body}}
}
try{while($true){
  $client=$listener.AcceptTcpClient();try{$c=ReadRequest $client}catch{$client.Close();continue}
  try{
    if(!(Test-Path -LiteralPath $instanceFile) -or [IO.File]::ReadAllText($instanceFile) -ne $instance){throw 'Folder was removed or replaced. Restart the system.'}
    $path=$c.Request.Url.AbsolutePath;$prefix='/'+$token+'/'
    if(!$path.StartsWith($prefix)){Reply $c 404 $utf8.GetBytes('Not found') 'text/plain';continue}
    if($c.Request.Headers['Origin'] -and $c.Request.Headers['Origin'] -ne $origin){Reply $c 403 $utf8.GetBytes('Origin denied') 'text/plain';continue}
    $route=$path.Substring($prefix.Length)
    if($route -eq 'api/status' -and $c.Request.HttpMethod -eq 'GET'){Reply $c 200 $utf8.GetBytes((@{kind='reporter-fee';canShutdown=$true;keyStorage=$true;pid=$PID;root=$root}|ConvertTo-Json -Compress)) 'application/json';continue}
    if($route -eq 'api/shutdown'){if($c.Request.HttpMethod -ne 'POST'){throw 'Method not allowed'};$filePattern='(?i)-File\s+"'+[regex]::Escape($PSCommandPath)+'"(?:\s|$)';foreach($peer in @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue)){if($peer.ProcessId -ne $PID -and $peer.CommandLine -match $filePattern -and $peer.CommandLine -match '(?i)\s-Serve(?:\s|$)'){Stop-Process -Id $peer.ProcessId -Force -ErrorAction SilentlyContinue}};Reply $c 200 $utf8.GetBytes('{}') 'application/json';break}
    if($route -eq 'api/key'){
      $keyFile=Join-Path $data '.deepseek-key'
      if($c.Request.HttpMethod -eq 'GET'){
        $plainKey='';if([IO.File]::Exists($keyFile)){try{$encryptedKey=[IO.File]::ReadAllText($keyFile,$utf8);if(!$encryptedKey.StartsWith('dpapi-v1:')){throw 'Invalid key file'};$cipherBytes=[Convert]::FromBase64String($encryptedKey.Substring(9));$plainBytes=[Security.Cryptography.ProtectedData]::Unprotect($cipherBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);$plainKey=$utf8.GetString($plainBytes);[Array]::Clear($plainBytes,0,$plainBytes.Length)}catch{throw 'Unable to read local API Key. Please clear it and save again.'}}
        Reply $c 200 $utf8.GetBytes((@{key=$plainKey}|ConvertTo-Json -Compress)) 'application/json';$plainKey=$null;continue
      }
      if($c.Request.HttpMethod -eq 'DELETE'){foreach($f in @($keyFile,($keyFile+'.replaced'))+[IO.Directory]::GetFiles($data,'.deepseek-key.*.tmp')){if([IO.File]::Exists($f)){[IO.File]::Delete($f)}};Reply $c 200 $utf8.GetBytes('{}') 'application/json';continue}
      if($c.Request.HttpMethod -ne 'POST'){throw 'Method not allowed'}
      $reader=New-Object IO.StreamReader($c.Request.InputStream,$utf8);$keyBody=$reader.ReadToEnd();$reader.Dispose()
      try{$keyInput=$keyBody|ConvertFrom-Json;$plainKey=[string]$keyInput.key;if([string]::IsNullOrWhiteSpace($plainKey) -or $plainKey.Length -gt 4096 -or $plainKey -match '[\r\n\x00]'){throw 'Invalid key'};$plainKey=$plainKey.Trim();$plainBytes=$utf8.GetBytes($plainKey);try{$cipherBytes=[Security.Cryptography.ProtectedData]::Protect($plainBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);$encryptedKey='dpapi-v1:'+[Convert]::ToBase64String($cipherBytes)}finally{[Array]::Clear($plainBytes,0,$plainBytes.Length)};$keyTmp=$keyFile+'.'+[guid]::NewGuid().ToString('N')+'.tmp';try{[IO.File]::WriteAllText($keyTmp,$encryptedKey,$utf8);if([IO.File]::Exists($keyFile)){[IO.File]::Replace($keyTmp,$keyFile,$keyFile+'.replaced')}else{[IO.File]::Move($keyTmp,$keyFile)}}finally{if([IO.File]::Exists($keyTmp)){[IO.File]::Delete($keyTmp)};if([IO.File]::Exists($keyFile+'.replaced')){[IO.File]::Delete($keyFile+'.replaced')}}}catch{throw 'Unable to save local API Key.'}finally{$plainKey=$null;$keyBody=$null;$keyInput=$null}
      Reply $c 200 $utf8.GetBytes('{}') 'application/json';continue
    }
    if($route -eq 'api/state'){
      $archive=Join-Path $data '周期存档';[IO.Directory]::CreateDirectory($archive)|Out-Null;$file=Join-Path $archive '完整存档.json';$legacy=Join-Path $data '月度存档\完整存档.json'
      if($c.Request.HttpMethod -eq 'GET'){$text='null';if([IO.File]::Exists($file)){$text=[IO.File]::ReadAllText($file,$utf8)}elseif([IO.File]::Exists($legacy)){$text=[IO.File]::ReadAllText($legacy,$utf8)};Reply $c 200 $utf8.GetBytes($text) 'application/json; charset=utf-8';continue}
      if($c.Request.HttpMethod -ne 'POST'){throw 'Method not allowed'}
      $reader=New-Object IO.StreamReader($c.Request.InputStream,$utf8);$text=$reader.ReadToEnd();$reader.Dispose();$snapshot=$text|ConvertFrom-Json
      if(!$snapshot.state -or $snapshot.schema -ne 1 -or $snapshot.state.kind -ne 'reporter-fee' -or $snapshot.state.version -ne 2 -or $snapshot.state.periodMode -ne 'bimonthly' -or $snapshot.state.month -notmatch '^\d{4}-(02|04|06|08|10|12)$' -or !$snapshot.state.rosters){throw 'Invalid bimonthly fee snapshot'}
      $months=@{};foreach($prop in $snapshot.state.rosters.PSObject.Properties){if($prop.Name -notmatch '^\d{4}-(02|04|06|08|10|12)$'){throw 'Invalid archive period'};$months[$prop.Name]=@($prop.Value)}
      foreach($work in @($snapshot.state.works)+@($snapshot.state.drafts)){if($work.month -notmatch '^\d{4}-(02|04|06|08|10|12)$'){throw 'Invalid work period'};if(!$months.ContainsKey($work.month)){$months[$work.month]=@()}}
      $legacyBackup=Join-Path $archive '完整存档_v1迁移前.json';if([IO.File]::Exists($legacy) -and ![IO.File]::Exists($legacyBackup)){[IO.File]::Copy($legacy,$legacyBackup)}
      AtomicWrite $file $text;PrunePreviousImports $file $snapshot.state
      foreach($month in $months.Keys){$end=[DateTime]::ParseExact($month,'yyyy-MM',[Globalization.CultureInfo]::InvariantCulture).AddMonths(1).ToString('yyyy-MM');$dir=Join-Path $archive ($month+'_'+$end);[IO.Directory]::CreateDirectory($dir)|Out-Null;$monthly=@{kind='reporter-fee-period';schema=1;version=2;periodStart=$month;periodEnd=$end;roster=@($months[$month]);rules=$snapshot.state.rules;scopeRules=$snapshot.state.scopeRules.$month;transferRecords=@($snapshot.state.transferRecords|Where-Object {$_.month -eq $month});videoImportRecords=@($snapshot.state.videoImportRecords|Where-Object {$_.month -eq $month});importRecords=@($snapshot.state.importRecords|Where-Object {$_.month -eq $month});works=@($snapshot.state.works|Where-Object {$_.month -eq $month});drafts=@($snapshot.state.drafts|Where-Object {$_.month -eq $month})};AtomicWrite (Join-Path $dir '稿费数据.json') ($monthly|ConvertTo-Json -Depth 100 -Compress);PrunePreviousImports (Join-Path $dir '稿费数据.json') $snapshot.state}
      Reply $c 200 $utf8.GetBytes('{}') 'application/json';continue
    }
    if($route -eq 'api/export' -and $c.Request.HttpMethod -eq 'POST'){
      $name=$c.Request.QueryString['name'];if(!$name -or $name.IndexOfAny([IO.Path]::GetInvalidFileNameChars()) -ge 0 -or $name -eq '.' -or $name -eq '..'){throw 'Invalid filename'}
      $dir=Join-Path $data $(if($name.EndsWith('.xlsx')){'输出/导出表格'}else{'输出/备份数据'});[IO.Directory]::CreateDirectory($dir)|Out-Null
      $stream=New-Object IO.MemoryStream;$c.Request.InputStream.CopyTo($stream);[IO.File]::WriteAllBytes((Join-Path $dir $name),$stream.ToArray());$stream.Dispose();Reply $c 200 $utf8.GetBytes('{}') 'application/json';continue
    }
    if($c.Request.HttpMethod -ne 'GET'){throw 'Method not allowed'}
    $relative=[Uri]::UnescapeDataString($route).Replace('/',[IO.Path]::DirectorySeparatorChar)
    $file=[IO.Path]::GetFullPath((Join-Path $webRoot $relative))
    if(!$file.StartsWith($webRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase) -or $relative.StartsWith('数据') -or $relative.StartsWith('.') -or $relative -match '\.(ps1|cmd)$' -or ![IO.File]::Exists($file)){Reply $c 404 $utf8.GetBytes('Not found') 'text/plain';continue}
    $type=switch([IO.Path]::GetExtension($file)){'.html'{'text/html; charset=utf-8'} '.js'{'text/javascript; charset=utf-8'} '.css'{'text/css; charset=utf-8'} '.jpg'{'image/jpeg'} '.png'{'image/png'} '.xlsx'{'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'} default{'application/octet-stream'}}
    Reply $c 200 ([IO.File]::ReadAllBytes($file)) $type
  }catch{try{Reply $c 409 $utf8.GetBytes($_.Exception.Message) 'text/plain; charset=utf-8'}catch{}}
}}finally{$listener.Stop();if(Test-Path -LiteralPath $runtime){try{$active=Get-Content -LiteralPath $runtime -Raw -Encoding UTF8|ConvertFrom-Json;if($active.pid -eq $PID){Remove-Item -LiteralPath $runtime -Force}}catch{}}}
