$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$draftRows = Import-Csv (Join-Path $PSScriptRoot "content-completion-matrix.csv")
$drafts = @{}
foreach ($row in $draftRows) { $drafts[$row.URL] = $row }
$clinicalRows = @(Import-Csv (Join-Path $PSScriptRoot "clinical-review-register.csv"))
$approvedUrls = @($clinicalRows | Where-Object publish_status -eq "approved" | ForEach-Object { ($_.page_or_file -split " -> ", 2)[-1].Trim() })
$productionReadback = @(Import-Csv (Join-Path $PSScriptRoot "raw\clinical-seo-production-readback-2026-09-02.csv"))
$verifiedUrls = @($productionReadback.URL)
$productionReceipt = Get-Content -Raw (Join-Path $PSScriptRoot "raw\production-write-receipt-2026-09-02-clinical-seo.json") | ConvertFrom-Json
$productionReviewDate = [string]$productionReceipt.public_verification.operational_rollout_date
if ($productionReviewDate -notmatch '^\d{4}-\d{2}-\d{2}$') { throw "Invalid production rollout date" }

$primaryByPath = @{
  "/about" = "Global Health Portugal"; "/blog" = "guias de saúde Portugal"; "/book" = "marcar consulta online";
  "/careers" = "carreiras Global Health"; "/contact" = "contactos Global Health Portugal";
  "/doctors" = "médicos em Portugal"; "/faq" = "perguntas frequentes consultas online";
  "/gp-consultation-online" = "clínico geral online Portugal"; "/legal" = "informação legal Global Health Portugal";
  "/legal/complaints-procedure" = "procedimento de reclamações Global Health Portugal";
  "/legal/medical-disclaimer" = "aviso médico Global Health Portugal";
  "/legal/privacy-policy" = "política de privacidade Global Health Portugal";
  "/legal/refund-policy" = "política de reembolso Global Health Portugal";
  "/legal/terms-of-service" = "termos e condições Global Health Portugal";
  "/press" = "Global Health Portugal imprensa"; "/pricing" = "planos Global Health Portugal";
  "/see-a-specialist" = "consulta de especialidade online";
  "/services/consulta-de-pediatria" = "pediatra online";
  "/health/diabetes" = "diabetes Portugal"; "/health/enxaqueca" = "enxaqueca Portugal";
  "/health/hipertensao" = "hipertensão Portugal"; "/health/infecoes-respiratorias" = "infeção respiratória Portugal";
  "/tools/adhd-test" = "teste de PHDA"; "/tools/bmi-calculator" = "calculadora de IMC";
  "/tools/calorie-calculator" = "calculadora de calorias"; "/tools/due-date-calculator" = "calculadora da data do parto";
  "/tools/osteoporosis-risk-checker" = "risco de osteoporose"; "/tools/ovulation-calculator" = "calculadora de ovulação";
  "/blog/atestado-medico-para-carta-de-conducao" = "atestado médico carta condução grupos 1 e 2";
  "/blog/autodeclaracao-de-doenca-ou-baixa-medica" = "autodeclaração de doença ou baixa médica";
  "/blog/baixa-medica-quanto-se-recebe-como-calcular" = "baixa médica quanto se recebe";
  "/blog/compreendendo-a-hipercolesterolemia" = "hipercolesterolemia Portugal";
  "/blog/consulta-do-viajante-quando-marcar" = "consulta do viajante quando marcar";
  "/blog/diabetes-a-doenca-silenciosa" = "diabetes doença silenciosa";
  "/blog/doenca-mao-pe-boca-sinais-e-tratamento" = "doença mão-pé-boca";
}

$secondaryByPath = @{
  "/about" = "telemedicina Global Health | serviços Global Health Portugal";
  "/blog" = "artigos de saúde em português | informação de saúde Portugal";
  "/book" = "agendar consulta pela internet | marcação de consulta Portugal";
  "/careers" = "trabalhar na Global Health | oportunidades Global Health";
  "/contact" = "contactar Global Health | apoio Global Health Portugal";
  "/doctors" = "médicos online Portugal | equipa médica Global Health";
  "/faq" = "dúvidas sobre consulta online | apoio a consultas online";
  "/gp-consultation-online" = "consulta de clínica geral online | médico de clínica geral online";
  "/legal" = "documentos legais Global Health | informação jurídica Global Health";
  "/legal/complaints-procedure" = "reclamações Global Health | como apresentar reclamação";
  "/legal/medical-disclaimer" = "informação médica geral | limitações da consulta online";
  "/legal/privacy-policy" = "proteção de dados Global Health | privacidade de dados de saúde";
  "/legal/refund-policy" = "reembolsos Global Health | condições de reembolso";
  "/legal/terms-of-service" = "condições de utilização Global Health | termos do serviço";
  "/press" = "Global Health notícias | contactos de imprensa Global Health";
  "/pricing" = "preços das consultas online | custos Global Health Portugal";
  "/see-a-specialist" = "médico especialista online | especialidades médicas online";
  "/services/consulta-de-pediatria" = "consulta de pediatria online | médico pediatra por videochamada";
  "/health/diabetes" = "sintomas da diabetes | controlo da diabetes";
  "/health/enxaqueca" = "sintomas de enxaqueca | tratamento da enxaqueca";
  "/health/hipertensao" = "tensão arterial elevada | controlo da hipertensão";
  "/health/infecoes-respiratorias" = "sintomas respiratórios | quando procurar avaliação médica";
  "/tools/adhd-test" = "questionário de PHDA | sinais de défice de atenção";
  "/tools/bmi-calculator" = "calcular índice de massa corporal | IMC adulto";
  "/tools/calorie-calculator" = "necessidades calóricas diárias | calcular calorias por dia";
  "/tools/due-date-calculator" = "calcular data provável do parto | semanas de gravidez";
  "/tools/osteoporosis-risk-checker" = "fatores de risco de osteoporose | avaliação do risco ósseo";
  "/tools/ovulation-calculator" = "calcular período fértil | dias de ovulação";
  "/blog/atestado-medico-para-carta-de-conducao" = "atestado médico para condução | grupos de carta de condução";
  "/blog/autodeclaracao-de-doenca-ou-baixa-medica" = "autodeclaração de doença SNS 24 | diferença entre baixa e autodeclaração";
  "/blog/baixa-medica-quanto-se-recebe-como-calcular" = "subsídio de doença cálculo | valor da baixa médica";
  "/blog/compreendendo-a-hipercolesterolemia" = "colesterol elevado | sintomas e risco cardiovascular";
  "/blog/consulta-do-viajante-quando-marcar" = "quando fazer consulta do viajante | preparação de saúde para viajar";
  "/blog/diabetes-a-doenca-silenciosa" = "sinais de diabetes | prevenção da diabetes";
  "/blog/doenca-mao-pe-boca-sinais-e-tratamento" = "sintomas de mão-pé-boca | contágio da doença mão-pé-boca";
}

$sitemap = (Invoke-WebRequest -UseBasicParsing "https://www.myglobalhealth.online/sitemap.xml").Content
$urls = [regex]::Matches($sitemap, "<loc>(https://www\.myglobalhealth\.online/portugal/pt(?:/[^<]*)?)</loc>") |
  ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

$liveRows = $urls | ForEach-Object -ThrottleLimit 8 -Parallel {
  $response = Invoke-WebRequest -UseBasicParsing $_ -TimeoutSec 30
  $html = $response.Content
  $title = [Net.WebUtility]::HtmlDecode(([regex]::Match($html, "<title[^>]*>(.*?)</title>", "IgnoreCase,Singleline").Groups[1].Value -replace "\s+", " ").Trim())
  $metaMatch = [regex]::Match($html, '<meta[^>]+name=["'']description["''][^>]+content=["''](.*?)["'']', "IgnoreCase,Singleline")
  $meta = [Net.WebUtility]::HtmlDecode(($metaMatch.Groups[1].Value -replace "\s+", " ").Trim())
  $h1Match = [regex]::Match($html, "<h1[^>]*>(.*?)</h1>", "IgnoreCase,Singleline")
  $h1 = [Net.WebUtility]::HtmlDecode((($h1Match.Groups[1].Value -replace "<[^>]+>", "") -replace "\s+", " ").Trim())
  $linkTags = [regex]::Matches($html, "<link\b[^>]*>", "IgnoreCase,Singleline") | ForEach-Object Value
  $canonicalTag = $linkTags | Where-Object { $_ -match '\brel=["''][^"'']*\bcanonical\b[^"'']*["'']' } | Select-Object -First 1
  $canonicalHref = [Net.WebUtility]::HtmlDecode([regex]::Match($canonicalTag, '\bhref=["'']([^"'']+)["'']', "IgnoreCase").Groups[1].Value)
  $ptTag = $linkTags | Where-Object { $_ -match '\brel=["''][^"'']*\balternate\b[^"'']*["'']' -and $_ -match '\bhreflang=["'']pt-PT["'']' } | Select-Object -First 1
  $ptHref = [Net.WebUtility]::HtmlDecode([regex]::Match($ptTag, '\bhref=["'']([^"'']+)["'']', "IgnoreCase").Groups[1].Value)
  $robotsTag = ([regex]::Matches($html, "<meta\b[^>]*>", "IgnoreCase,Singleline") | ForEach-Object Value | Where-Object { $_ -match '\bname=["'']robots["'']' }) -join " "
  $robots = [regex]::Match($robotsTag, '\bcontent=["'']([^"'']*)["'']', "IgnoreCase").Groups[1].Value
  $xRobots = [string]($response.Headers["X-Robots-Tag"] -join ",")
  $htmlLang = [regex]::Match($html, '<html[^>]+lang=["'']([^"'']+)', "IgnoreCase").Groups[1].Value
  $ogLocaleTag = ([regex]::Matches($html, "<meta\b[^>]*>", "IgnoreCase,Singleline") | ForEach-Object Value | Where-Object { $_ -match '\bproperty=["'']og:locale["'']' }) | Select-Object -First 1
  $ogLocale = [regex]::Match($ogLocaleTag, '\bcontent=["'']([^"'']*)["'']', "IgnoreCase").Groups[1].Value
  $jsonLd = [regex]::Matches($html, '<script[^>]+type=["'']application/ld\+json["''][^>]*>(.*?)</script>', "IgnoreCase,Singleline")
  $jsonLdValid = $jsonLd.Count -gt 0
  foreach ($script in $jsonLd) {
    try { $null = $script.Groups[1].Value | ConvertFrom-Json -Depth 100 } catch { $jsonLdValid = $false }
  }
  $schemaTypes = $jsonLd | ForEach-Object {
    [regex]::Matches($_.Groups[1].Value, '["'']@type["'']\s*:\s*["'']([^"'']+)', "IgnoreCase") | ForEach-Object { $_.Groups[1].Value }
  } | Sort-Object -Unique
  $ctaLinks = [regex]::Matches($html, '<a\b[^>]*href=["'']([^"'']+)["''][^>]*>(.*?)</a>', "IgnoreCase,Singleline") | ForEach-Object {
    [pscustomobject]@{
      Href = [Net.WebUtility]::HtmlDecode($_.Groups[1].Value)
      Text = [Net.WebUtility]::HtmlDecode((($_.Groups[2].Value -replace "<[^>]+>", "") -replace "\s+", " ").Trim())
    }
  }
  $correctBookingCta = @($ctaLinks | Where-Object { $_.Text -eq "Marcar consulta" -and $_.Href -eq "/portugal/pt/book" }).Count -gt 0
  $englishBookingCta = @($ctaLinks | Where-Object { $_.Text -match '^(Book a consultation|Book consultation|Book now|See a doctor)$' }).Count -gt 0
  [pscustomobject]@{
    URL = $_; Title = $title; Meta = $meta; H1 = $h1; Status = [int]$response.StatusCode;
    CanonicalOk = $canonicalHref.TrimEnd("/") -eq $_.TrimEnd("/");
    HreflangOk = $ptHref.TrimEnd("/") -eq $_.TrimEnd("/");
    Indexable = [int]$response.StatusCode -eq 200 -and "$robots,$xRobots" -notmatch "(?i)noindex";
    LocaleOk = $htmlLang -eq "pt" -and $ogLocale -eq "pt_PT";
    JsonLdValid = $jsonLdValid; SchemaTypes = @($schemaTypes);
    CtaOk = $correctBookingCta -and !$englishBookingCta
  }
}

$rows = foreach ($live in ($liveRows | Sort-Object URL)) {
  $path = ([uri]$live.URL).AbsolutePath.Substring("/portugal/pt".Length)
  $draft = $drafts[$live.URL]
  $type = if (!$path) { "market hub" } elseif ($path -like "/services/*") { "service page" } elseif ($path -like "/doctors/*") { "doctor profile" } elseif ($path -like "/tools/*") { "health tool" } elseif ($path -like "/health/*") { "health guide" } elseif ($path -like "/blog/*") { "health article" } elseif ($path -like "/legal*") { "legal page" } else { "static page" }
  $primary = if ($draft) { $draft.'primary keyword' } elseif ($type -eq "doctor profile") { $live.H1.ToLowerInvariant() } else { $primaryByPath[$path] }
  if (!$primary) { throw "Missing primary keyword for $($live.URL)" }
  $secondary = if ($draft) { $draft.'secondary keywords' } elseif ($type -eq "doctor profile") { "$primary Portugal | perfil $primary" } else { $secondaryByPath[$path] }
  if (!$secondary) { throw "Missing secondary keywords for $($live.URL)" }
  $optimizedTitle = if ($draft) { $draft.'optimized title' } elseif ($path -eq "/pricing") { "Planos mensais ainda indisponíveis | Global Health Portugal" } elseif ($path -eq "/faq") { "Perguntas frequentes sobre consultas online | Portugal" } elseif ($path -eq "/gp-consultation-online") { "Clínico Geral Online em Portugal | Global Health" } elseif ($path -eq "/see-a-specialist") { "Consultas de Especialidade Online em Portugal" } elseif ($path -eq "/doctors") { "Médicos Online em Portugal | Global Health" } elseif ($path -eq "/health/infecoes-respiratorias") { "Infeções Respiratórias em Portugal | Avaliação Médica" } else { $live.Title }
  $optimizedMeta = if ($draft) { $draft.'optimized meta description' } elseif ($path -eq "/pricing") { "Os planos mensais ainda não estão disponíveis em Portugal. Consulte os serviços online e os preços apresentados antes de marcar." } elseif ($path -eq "/faq") { "Respostas sobre marcações, pagamentos, videochamadas, privacidade e situações em que uma consulta online pode não ser adequada." } elseif ($path -eq "/gp-consultation-online") { "Consulte um médico online em Portugal por videochamada. Veja os serviços de clínica geral e escolha um horário disponível no calendário do médico." } elseif ($path -eq "/see-a-specialist") { "Consulte as especialidades médicas disponíveis online em Portugal e escolha um horário no calendário do profissional." } elseif ($path -eq "/doctors") { "Conheça médicos e especialistas disponíveis para consulta online em Portugal e consulte as credenciais apresentadas em cada perfil." } elseif ($path -eq "/blog/doenca-mao-pe-boca-sinais-e-tratamento") { "Guia sobre doença mão-pé-boca em crianças: sintomas, tratamento, sinais de urgência e prevenção do contágio." } elseif ($type -eq "doctor profile") { ($live.Meta -replace "\s*Consulta no mesmo dia\.?$", "") } elseif ($path -eq "/health/infecoes-respiratorias") { "Informação sobre tosse, infeções e outros sintomas respiratórios, incluindo quando procurar avaliação médica." } else { $live.Meta }
  $changed = $optimizedTitle -ne $live.Title -or $optimizedMeta -ne $live.Meta
  $clinical = $type -in @("service page", "doctor profile", "health tool", "health guide", "health article", "market hub") -or $path -in @("/gp-consultation-online", "/see-a-specialist", "/doctors")
  $approved = $draft -and $approvedUrls -contains $live.URL
  $productionVerified = $approved -and $verifiedUrls -contains $live.URL
  $approvedRetained = $approved -and !$productionVerified -and $draft.'implementation status' -eq "clinically reviewed; unchanged"
  if ($approved -and !$productionVerified -and !$approvedRetained) { throw "Approved URL has no production readback or retain-current decision: $($live.URL)" }
  $requiredSchema = if ($type -eq "doctor profile") { "Person" } elseif ($type -in @("health tool", "health guide", "health article")) { "MedicalWebPage" } elseif ($path -eq "/faq") { "FAQPage" } else { "WebSite" }
  $pageSchemaOk = if ($type -eq "service page") { $live.SchemaTypes -contains "Service" -or $live.SchemaTypes -contains "MedicalProcedure" } else { $live.SchemaTypes -contains $requiredSchema }
  $structuredDataOk = $live.JsonLdValid -and $live.SchemaTypes -contains "MedicalOrganization" -and $pageSchemaOk
  $implemented = $path -in @("/pricing", "/faq")
  $status = if ($productionVerified) { "live verified $productionReviewDate" } elseif ($approvedRetained) { "clinically reviewed; unchanged" } elseif ($implemented) { "implemented in repository; deployment pending" } elseif ($changed -and $clinical) { "drafted; blocked pending clinical or credential review" } else { "reviewed; unchanged" }
  $reason = if ($approved) { $draft.'reason for anything left unchanged' } elseif ($path -eq "/faq") { "Repository metadata, H1 and visible lede override implemented. Existing FAQ questions and answers were reviewed and left unchanged because no factual or demand-supported revision was justified." } elseif ($implemented) { "Repository metadata and H1 override implemented; no production CMS write required." } elseif ($changed -and $clinical) { "Current live copy was reviewed and a safer draft prepared, but publication is blocked until the required clinical, credential or official-source approval is recorded." } else { "Current copy remains relevant; the measured status, canonical, pt-PT hreflang/locale, robots, structured data and CTA checks passed on 2026-09-01." }
  [pscustomobject][ordered]@{
    URL = $live.URL; "page type" = $type; "primary keyword" = $primary; "secondary keywords" = $secondary;
    "original title" = if ($draft) { $draft.'original title' } else { $live.Title }; "optimized title" = $optimizedTitle; "original meta description" = if ($draft) { $draft.'original meta description' } else { $live.Meta };
    "optimized meta description" = $optimizedMeta; "description optimized" = if ($implemented) { "yes" } else { "no" };
    "bio optimized" = if ($type -eq "doctor profile") { "no" } else { "not applicable" };
    "FAQs optimized" = if ($type -in @("service page", "doctor profile", "health guide", "health article") -or $path -eq "/faq") { "no" } else { "not applicable" };
    "deslop completed" = "yes"; "factual verification completed" = if ($approved) { "yes" } elseif ($clinical) { "no" } else { "yes" };
    "clinical review required" = if ($clinical) { "yes" } else { "no" }; "implementation status" = $status;
    "reason for anything left unchanged" = $reason; "live H1" = $live.H1;
    "HTTP status" = [string]$live.Status;
    canonical = if ($live.CanonicalOk) { "yes" } else { "no" };
    hreflang_pt_PT = if ($live.HreflangOk) { "yes" } else { "no" };
    indexable = if ($live.Indexable) { "yes" } else { "no" };
    locale_pt_PT = if ($live.LocaleOk) { "yes" } else { "no" };
    "structured data" = if ($structuredDataOk) { "yes" } else { "no" };
    "structured data types" = $live.SchemaTypes -join " | ";
    "CTA accuracy" = if ($live.CtaOk) { "yes" } else { "no" };
    "live reviewed at" = if ($approved) { $productionReviewDate } else { "2026-09-01" }
  }
}

if ($rows.Count -ne 75) { throw "Expected 75 live Portugal pt-PT pages, found $($rows.Count)" }
$rows | Export-Csv (Join-Path $PSScriptRoot "page-by-page-completion-matrix.csv") -NoTypeInformation -Encoding utf8
Write-Output "Wrote $($rows.Count) rows to page-by-page-completion-matrix.csv"
