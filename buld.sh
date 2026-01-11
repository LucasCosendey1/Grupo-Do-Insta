#!/bin/bash

echo "🧪 SCRIPT DE TESTE - Instagram Followers App"
echo "=============================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar se arquivo existe
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅ $1 existe${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 NÃO ENCONTRADO${NC}"
        return 1
    fi
}

# Função para verificar conteúdo do arquivo
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅ $1 contém '$2'${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 NÃO contém '$2'${NC}"
        return 1
    fi
}

echo "📁 VERIFICANDO ARQUIVOS DE CONFIGURAÇÃO..."
echo "-------------------------------------------"
check_file "postcss.config.mjs"
check_file "tsconfig.json"
check_file "package.json"
check_file "next.config.js"
echo ""

echo "📁 VERIFICANDO ESTRUTURA DA APP..."
echo "-------------------------------------------"
check_file "app/layout.tsx"
check_file "app/page.tsx"
check_file "app/globals.css"
check_file "app/api/scrape/route.js"
check_file "app/api/image-proxy/route.js"
echo ""

echo "🔍 VERIFICANDO CONTEÚDO CRÍTICO..."
echo "-------------------------------------------"
check_content "app/layout.tsx" "import './globals.css'"
check_content "app/api/scrape/route.js" "&username=\${username}"
echo ""

echo "📦 VERIFICANDO DEPENDÊNCIAS..."
echo "-------------------------------------------"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules existe${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules não existe - Execute: npm install${NC}"
fi
echo ""

echo "🚀 INICIANDO TESTES DE BUILD..."
echo "-------------------------------------------"
echo ""

# Limpar cache do Next.js
echo "🧹 Limpando cache do Next.js..."
rm -rf .next
echo ""

# Verificar se pode importar módulos
echo "🔍 Testando imports do TypeScript..."
npx tsc --noEmit 2>&1 | head -20
echo ""

# Tentar build de produção
echo "🏗️  Tentando build de produção..."
npm run build 2>&1 | tail -30
BUILD_STATUS=$?

echo ""
echo "=============================================="
if [ $BUILD_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ BUILD CONCLUÍDO COM SUCESSO!${NC}"
    echo ""
    echo "🎉 Agora você pode testar localmente:"
    echo "   npm run dev"
    echo ""
    echo "Ou fazer deploy no Vercel:"
    echo "   git add ."
    echo "   git commit -m 'Fix: Corrigir configurações e proxy de imagens'"
    echo "   git push"
else
    echo -e "${RED}❌ BUILD FALHOU - Veja os erros acima${NC}"
    echo ""
    echo "💡 Dicas para resolver:"
    echo "   1. Verifique se todos os arquivos foram atualizados"
    echo "   2. Execute: npm install"
    echo "   3. Execute: rm -rf .next && npm run build"
fi
echo "=============================================="