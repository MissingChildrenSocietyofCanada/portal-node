echo off
echo Configuring environment for local execution
echo ===========================================
echo Configuring environment variables:

echo  - DocDBHost
set DocDBHost=https://mcsc-hfm-db-dev.documents.azure.com:443/
rem set MONGO_DB=mongodb://localhost:27017
echo    %DocDBHost%

echo  - DocDBAuthKey
set DocDBAuthKey=846tOpNpxGm0XdmCSzV4HHPJIL8ZJOqnKc9XWTs4e9H9syBXI87g4Gc9FHq2bu1EO5iAhkxwhtvPQZVbFZCfrA==
echo    %DocDBAuthKey%

echo  - PORT
set PORT=3000
echo    %PORT%

echo  - IdentityMetadata
set IdentityMetadata=https://login.microsoftonline.com/adminmcscstrutcreative.onmicrosoft.com/v2.0/.well-known/openid-configuration
echo    %IdentityMetadata%

echo  - ClientID
set ClientID=05c72545-826f-4fed-876e-7f97e88a86ed
REMset ClientID=176fd07e-ed0b-4ded-bbdc-44f14ab4c36e
echo    %ClientID%

echo  - ClientSecret
set ClientSecret=VSPNOJvTXlASvMd69FM9M/DUduPJ7CjfKdwqxyAbBfQ=
REM set ClientSecret=o5roTYPqMrrtoGEH8jR5aihJgErNgRS7BNiewR9EtRI=
echo    %ClientSecret%

echo  - RedirectUrl
set RedirectUrl=http://localhost:3000/auth/openid/return
echo    %RedirectUrl%

echo  - NotifyPoliceUrl
set NotifyPoliceUrl=https://mcsc-hfm-functions-dev.azurewebsites.net/api/notify_police?code=WAhNepnsDGuuLV1aTrPnvGfjK1i51gKd9NfBcLHR4wURfWiKMcRs/Q==
echo    %NotifyPoliceUrl%

echo  - ValidateTokenUrl
set ValidateTokenUrl=https://mcsc-hfm-functions-dev.azurewebsites.net/api/validatetoken
echo    %ValidateTokenUrl%

echo  - DestroySessionUrl
set DestroySessionUrl=https://login.microsoftonline.com/common/oauth2/logout?post_logout_redirect_uri=http://localhost:3000
echo    %DestroySessionUrl%

echo  - RequiredAADGroupId
set RequiredAADGroupId=e94e6cd1-0b55-4133-9180-883528d05474
echo    %RequiredAADGroupId%

echo  - CookieEncryptionKey
set CookieEncryptionKey=IfdMTEtfctZepbrWJRirT2P48ZmS/piP
echo    %CookieEncryptionKey%

echo  - CookieEncryptionIv
set CookieEncryptionIv=WAKh2VAYzQc=
echo    %CookieEncryptionIv%

echo  - APPINSIGHTS_INSTRUMENTATIONKEY
set APPINSIGHTS_INSTRUMENTATIONKEY=e1fc475a-e8b1-4b5d-8c93-36731d7e9b59
echo    %APPINSIGHTS_INSTRUMENTATIONKEY%

echo ===========================================
echo Running node server.js
nodemon server.js
