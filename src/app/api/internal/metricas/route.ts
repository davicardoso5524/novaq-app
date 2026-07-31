import { TenantStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function hasValidPlatformKey(request: Request) {
  return Boolean(process.env.PLATFORM_SECRET_KEY) && request.headers.get("x-platform-key") === process.env.PLATFORM_SECRET_KEY;
}

export async function GET(request: Request) {
  if (!hasValidPlatformKey(request)) {
    return Response.json({ error: "Chave da plataforma inválida." }, { status: 401 });
  }

  const activeTenants = await prisma.tenant.count({
    where: { status: TenantStatus.ACTIVE, deletedAt: null },
  });

  return Response.json({
    totalProdutos: 0,
    totalPedidos: 0,
    totalClientes: activeTenants,
    faturamentoMes: 0,
    ultimoAcesso: null,
    status: "ativo",
  });
}
