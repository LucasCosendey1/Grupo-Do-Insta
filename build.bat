@echo off
echo.
echo ========================================
echo 🧪 TESTE - Instagram Followers App
echo ========================================
echo.

echo 📁 VERIFICANDO ARQUIVOS...
echo ----------------------------------------
if exist "postcss.config.mjs" (echo ✅ postcss.config.mjs) else (echo ❌ postcss.config.mjs FALTANDO)
if exist "tsconfig.json" (echo ✅ tsconfig.json) else (echo ❌ tsconfig.json FALTANDO)
if exist "app\layout.tsx" (echo ✅ app\layout.tsx) else (echo ❌ app\layout.tsx FALTANDO)
if exist "app\page.tsx" (echo ✅ app\page.tsx) else (echo ❌ app\page.tsx FALTANDO)
if exist "app\api\scrape\route.js" (echo ✅ app\api\scrape\route.js) else (echo ❌ app\api\scrape\route.js FALTANDO)
if exist "app\api\image-proxy\route.js" (echo ✅ app\api\image-proxy\route.js) else (echo ❌ app\api\image-proxy\route.js FALTANDO)
echo.

echo 🧹 LIMPANDO CACHE...
echo ----------------------------------------
if exist ".next" (
    echo Removendo pasta .next...
    rmdir /s /q .next
)
echo Cache limpo!
echo.

echo 📦 INSTALANDO DEPENDÊNCIAS...
echo ----------------------------------------
call npm install
echo.

echo 🏗️ TESTANDO BUILD...
echo ----------------------------------------
call npm run build
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ BUILD SUCESSO! TUDO FUNCIONANDO!
    echo ========================================
    echo.
    echo 🎉 Agora você pode:
    echo    1. Testar local: npm run dev
    echo    2. Fazer deploy: git push
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FALHOU - Veja erros acima
    echo ========================================
    echo.
    echo 💡 Tente:
    echo    1. Verificar se todos arquivos foram substituídos
    echo    2. Rodar: npm install novamente
    echo    3. Deletar node_modules e rodar npm install
    echo.
)

pause