/**
 * Create/publish the Portugal Medical Disclaimer (CountryLegalDocument,
 * MEDICAL_DISCLAIMER, locale "pt") from GlobalHealth_DisclaimerMedico_Portugal.
 * Served at /portugal/pt/legal/medical-disclaimer. Idempotent upsert.
 *
 *   node --env-file=.env --import tsx scripts/import-portugal-disclaimer.ts          # dry-run
 *   node --env-file=.env --import tsx scripts/import-portugal-disclaimer.ts --apply
 */
import { LegalDocumentType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "pt";
const LOCALE = "pt";
const APPLY = process.argv.includes("--apply");

const DISCLAIMER_TITLE = "Disclaimer Médico";

const DISCLAIMER_HTML = [
  // Intro
  "<p>Este Disclaimer Médico rege todos os serviços clínicos prestados através da plataforma Global Health em Portugal, acessível em myglobalhealth.online. Ao marcar uma consulta ou utilizar qualquer serviço clínico através desta plataforma, o utilizador reconhece que leu, compreendeu, e aceita os termos estabelecidos neste documento.</p>",
  "<p>Este disclaimer aplica-se a todos os serviços prestados em Portugal, incluindo consultas de Clínica Geral, Medicina Geral e Familiar, consultas de especialidade, e consultas de profissionais de saúde aliados. Aplicam-se disclaimers próprios aos serviços prestados noutros mercados — Irlanda, República Checa, Espanha, Roménia, e Brasil — disponíveis nas páginas respetivas de cada país desta plataforma.</p>",
  "<p><em>Última atualização: Setembro 2026</em></p>",

  // Emergency box
  "<h2>⚠ Emergência Médica — Leia Primeiro</h2>",
  "<p><strong>As videoconsultas não são adequadas para emergências médicas.</strong></p>",
  "<p>Se o utilizador, ou alguém junto de si, está a passar por uma emergência médica — incluindo dor torácica, dificuldade respiratória, sintomas de AVC, perda de consciência, reação alérgica grave, ou qualquer outra condição que represente risco de vida — não marque uma consulta online.</p>",
  '<p><strong>Contacte o <a href="tel:112">112</a> imediatamente, ou dirija-se ao serviço de urgência mais próximo.</strong></p>',
  "<p>Recursos de crise de saúde mental:</p>",
  "<ul>" +
    '<li>SNS 24 — <a href="tel:808242424">808 24 24 24</a> (gratuito, 24/7)</li>' +
    '<li>Linha Nacional de Prevenção do Suicídio e Apoio Psicológico — <a href="tel:1411">1411</a></li>' +
    '<li>SOS Voz Amiga — <a href="tel:213544545">213 544 545</a></li>' +
    '<li>Liga Portuguesa Contra o Cancro (apoio emocional oncológico) — <a href="tel:808222555">808 222 555</a></li>' +
    "</ul>",

  // 1
  "<h2>1. Declaração Geral — Todos os Serviços</h2>",
  "<p>Todos os serviços clínicos prestados através da Global Health em Portugal são realizados em conformidade com as normas portuguesas de telemedicina e prática médica, por médicos e profissionais de saúde registados na entidade reguladora portuguesa competente.</p>",
  "<p>As avaliações clínicas realizadas através desta plataforma são avaliações à distância. São conduzidas segundo os mesmos padrões profissionais dos cuidados presenciais, mas têm limitações inerentes — exame físico, determinados procedimentos diagnósticos, e intervenções de emergência não podem ser prestados à distância. O profissional de saúde informa claramente o utilizador se a sua apresentação exigir avaliação presencial, e coordena o percurso de referenciação adequado.</p>",
  "<p>Todas as recomendações clínicas, referenciações, prescrições, e documentação são emitidas exclusivamente ao critério profissional do médico ou profissional de saúde, após avaliação completa. Nenhum resultado clínico específico — incluindo a emissão de uma prescrição, referenciação, atestado médico, ou qualquer outro documento clínico — pode ser confirmado ou garantido antecipadamente.</p>",
  "<p>Esta plataforma não disponibiliza aconselhamento médico fora de uma consulta clínica formal. A informação disponibilizada neste website é orientação geral e não constitui avaliação clínica ou aconselhamento médico específico às circunstâncias individuais do utilizador.</p>",

  // 2
  "<h2>2. Serviços de Clínica Geral e Medicina Geral e Familiar</h2>",
  "<p>Os serviços de Clínica Geral e Medicina Geral e Familiar prestados através da Global Health em Portugal são realizados em plena conformidade com as normas portuguesas de telemedicina e prática clínica.</p>",
  "<p>Todos os médicos que prestam serviços de Clínica Geral através desta plataforma estão registados na Ordem dos Médicos. Os médicos que prestam consultas de Medicina Geral e Familiar detêm o título de especialista reconhecido pela Ordem dos Médicos nesta área. Os números de cédula profissional são apresentados em cada perfil de médico e podem ser verificados em ordemdosmedicos.pt.</p>",
  "<p>As consultas são realizadas à distância por videochamada encriptada e segura. Aplicam-se as seguintes limitações de âmbito a todos os serviços de Clínica Geral e MGF:</p>",
  "<ul>" +
    "<li>O exame físico não pode ser conduzido à distância. O médico realiza a avaliação com base no historial clínico e na observação visual durante a videochamada. Quando o exame físico é clinicamente necessário, o médico aconselha sobre avaliação presencial adequada.</li>" +
    "<li>Determinados exames complementares — incluindo análises ao sangue, imagiologia (radiografia, RM, TC, ecografia), e eletrocardiograma — exigem deslocação presencial. O médico pode avaliar a necessidade destes exames e coordenar os respetivos pedidos quando clinicamente indicado.</li>" +
    "<li>Os nossos médicos não prescrevem rotineiramente substâncias controladas através de videoconsultas.</li>" +
    "</ul>",
  "<p>As decisões clínicas — incluindo a emissão de prescrições, referenciações, atestados médicos, e outra documentação clínica — são tomadas exclusivamente ao critério profissional do médico, após avaliação completa. Nenhuma decisão clínica pode ser garantida antecipadamente.</p>",

  // 3
  "<h2>3. Serviços Médicos de Especialidade</h2>",
  "<p>As consultas de especialidade — incluindo Cardiologia, Pediatria, Psiquiatria, e Oncologia — são prestadas por médicos registados no respetivo Colégio de Especialidade da Ordem dos Médicos. O registo de especialidade é apresentado no perfil de cada médico especialista e pode ser verificado em ordemdosmedicos.pt.</p>",
  "<p>As consultas de especialidade são realizadas à distância por videochamada encriptada e segura. Aplicam-se as seguintes limitações adicionais de âmbito aos serviços de especialidade:</p>",
  "<ul>" +
    "<li>O exame físico especializado completo — incluindo auscultação cardíaca, exame neurológico completo, e avaliação pediátrica presencial — não pode ser conduzido à distância. O médico especialista informa se o exame presencial é clinicamente necessário.</li>" +
    "<li>Investigações de especialidade — incluindo ecocardiograma, EEG, estudos de condução nervosa, e imagiologia especializada — exigem deslocação presencial ao local adequado. O médico especialista coordena os respetivos pedidos quando clinicamente indicado.</li>" +
    "<li>Emergências neurológicas — incluindo cefaleia súbita intensa, sintomas de AVC agudo, crise convulsiva de início recente, e deterioração neurológica aguda — exigem avaliação presencial de emergência imediata. Não marque uma consulta à distância para estas apresentações.</li>" +
    "<li>A avaliação e o tratamento involuntário ao abrigo da Lei de Saúde Mental (Lei n.º 36/98, de 24 de julho) não podem ser realizados através de consulta à distância. Quando a avaliação involuntária pode ser necessária, o psiquiatra encaminha imediatamente o doente para o serviço presencial adequado.</li>" +
    "<li>As consultas de pediatria para doentes com menos de 16 anos exigem a presença de um pai ou encarregado de educação e o respetivo consentimento informado. Os nossos pediatras estão vinculados à Lei de Proteção de Crianças e Jovens em Perigo.</li>" +
    "<li>As consultas de oncologia disponibilizam segunda opinião, esclarecimento clínico, e apoio em cuidados paliativos. Não incluem administração de quimioterapia ou outras terapêuticas sistémicas, que exigem sempre administração presencial em unidade especializada, nem substituem a equipa hospitalar assistente do doente.</li>" +
    "</ul>",

  // 4
  "<h2>4. Serviços de Psicologia</h2>",
  "<p>As consultas de psicologia são prestadas por psicólogas registadas na Ordem dos Psicólogos Portugueses (OPP) — a entidade reguladora portuguesa para a profissão de psicologia. O registo pode ser verificado em ordemdospsicologos.pt.</p>",
  "<p>As consultas de psicologia disponibilizam avaliação psicológica e terapia baseada em evidência em regime de ambulatório. Aplicam-se as seguintes limitações de âmbito:</p>",
  "<ul>" +
    "<li>Este serviço disponibiliza avaliação e terapia psicológica em ambulatório. Não é um serviço de intervenção em crise, um serviço psiquiátrico, ou um serviço de cuidados de saúde mental de internamento.</li>" +
    "<li>Perturbações do comportamento alimentar diagnosticadas — incluindo anorexia nervosa e bulimia nervosa — exigem cuidados multidisciplinares especializados. Este serviço não disponibiliza tratamento primário de perturbações do comportamento alimentar. Doentes com preocupações relacionadas devem falar com o seu médico em primeira instância.</li>" +
    "<li>Quando uma apresentação exige apoio mais intensivo — incluindo cuidados de internamento, serviços especializados de perturbações do comportamento alimentar, ou avaliação psiquiátrica — a psicóloga aconselha e coordena a referenciação adequada.</li>" +
    "</ul>",
  "<p>A confidencialidade é mantida em conformidade com o Código Deontológico da OPP. Em circunstâncias limitadas — quando existe risco sério e imediato para a vida — as obrigações de confidencialidade podem precisar de ser cuidadosamente consideradas. A psicóloga discute a confidencialidade no início da primeira sessão.</p>",
  "<p><strong>Recursos de crise de saúde mental — Portugal.</strong> Se está em crise ou a ter pensamentos de suicídio ou autolesão:</p>",
  "<ul>" +
    '<li>SNS 24 — <a href="tel:808242424">808 24 24 24</a> (gratuito, 24/7)</li>' +
    '<li>Linha Nacional de Prevenção do Suicídio e Apoio Psicológico — <a href="tel:1411">1411</a></li>' +
    '<li>SOS Voz Amiga — <a href="tel:213544545">213 544 545</a></li>' +
    '<li>Serviços de emergência — <a href="tel:112">112</a></li>' +
    "</ul>",

  // 5
  "<h2>5. Serviços de Nutrição</h2>",
  "<p>As consultas de nutrição são prestadas por nutricionista registada na Ordem dos Nutricionistas (OND). Nutricionista é título profissional protegido por lei em Portugal. O registo pode ser verificado em ordemdosnutricionistas.pt.</p>",
  "<p>Este serviço disponibiliza avaliação e gestão nutricional, incluindo apoio nutricional no contexto de doença crónica, em conformidade com o âmbito de prática da profissão de nutricionista em Portugal.</p>",
  "<p>Doentes com condições médicas complexas devem assegurar que o apoio nutricional é coordenado com o seu médico ou especialista. Determinadas condições clínicas de nutrição complexa — incluindo nutrição renal aguda, nutrição oncológica em contexto hospitalar, e suporte nutricional entérico ou parentérico — podem exigir gestão clínica especializada adicional.</p>",

  // 6
  "<h2>6. Atestados Médicos e Documentação</h2>",
  "<p>Aplicam-se os seguintes termos especificamente a atestados médicos e documentação clínica emitidos através desta plataforma:</p>",
  "<ul>" +
    "<li>A decisão sobre que documentação emitir — justificação médica de falta, baixa médica formal com comunicação à Segurança Social, ou nenhuma das duas — assim como a sua duração, é uma decisão clínica tomada exclusivamente pelo médico, após avaliação completa, e não pode ser garantida antecipadamente.</li>" +
    "<li>Justificações médicas de falta emitidas através da nossa plataforma são aceites pela generalidade das entidades patronais e instituições de ensino em Portugal.</li>" +
    "<li>A baixa médica formal, quando clinicamente indicada, é comunicada eletronicamente à Segurança Social como parte do procedimento normal.</li>" +
    "<li>Documentação retroativa não é habitualmente emitida, devido à ausência de avaliação clínica direta no momento da doença.</li>" +
    "<li>Atestados médicos para fins administrativos — incluindo carta de condução, caça, náutica de recreio, desporto, e concursos públicos — são emitidos com base na avaliação clínica do historial médico do doente e nos parâmetros de saúde apresentados pelo doente, obtidos previamente à consulta. A emissão destes atestados não pode ser garantida antecipadamente.</li>" +
    "<li>Atestados para licença de uso e porte de arma e avaliações de medicina do trabalho podem não ser adequados para emissão através desta plataforma e devem ser confirmados previamente com a equipa clínica.</li>" +
    "</ul>",

  // 7
  "<h2>7. Medicação e Tratamento</h2>",
  "<p>Aplicam-se os seguintes termos a todos os aspetos relacionados com medicação nas consultas prestadas através desta plataforma:</p>",
  "<ul>" +
    "<li>Os nossos médicos não prescrevem rotineiramente substâncias controladas através de videoconsultas. Quando medicação controlada é clinicamente indicada como parte de um plano de tratamento estabelecido, o médico aconselha sobre o percurso clínico e regulatório adequado.</li>" +
    "<li>Todas as decisões de medicação — incluindo iniciação, continuação, ajuste, ou suspensão de qualquer medicamento — são tomadas exclusivamente ao critério profissional do médico, após avaliação clínica completa. Nenhuma medicação pode ser iniciada, continuada, ou ajustada sem uma avaliação clínica completa.</li>" +
    "<li>Determinadas terapêuticas — incluindo isotretinoína para acne moderada a grave — exigem protocolo de monitorização específico, com prescrições emitidas por período definido e sujeitas a revisão clínica em cada renovação.</li>" +
    "<li>As prescrições, quando emitidas, são processadas eletronicamente em conformidade com as normas portuguesas de prescrição e as orientações do Infarmed. O doente é responsável por apresentar a prescrição numa farmácia registada em Portugal.</li>" +
    "</ul>",

  // 8
  "<h2>8. Serviços de Pediatria e Proteção de Menores</h2>",
  "<p>Aplicam-se os seguintes termos especificamente a todas as consultas de pediatria — ao nível de Clínica Geral e ao nível de especialidade — prestadas através desta plataforma:</p>",
  "<ul>" +
    "<li>Todas as consultas de pediatria para doentes com menos de 16 anos exigem a presença de um pai ou encarregado de educação durante toda a consulta, e o respetivo consentimento informado para a consulta e quaisquer recomendações clínicas.</li>" +
    "<li>Para doentes adolescentes a partir dos 16 anos, o médico avalia a capacidade de consentimento em conformidade com as normas médicas e legais portuguesas.</li>" +
    "<li>Os nossos profissionais clínicos estão vinculados à Lei de Proteção de Crianças e Jovens em Perigo (Lei n.º 147/99) e às respetivas obrigações profissionais. Quando uma consulta levanta preocupações de proteção de menores, o profissional clínico está legal e profissionalmente obrigado a atuar em conformidade com esta legislação, podendo envolver a Comissão de Proteção de Crianças e Jovens (CPCJ) competente. Esta obrigação prevalece sobre a confidencialidade.</li>" +
    "<li>Febre em bebés com menos de 3 meses de idade é uma emergência médica que exige avaliação presencial imediata. Contacte o 112 ou dirija-se ao serviço de urgência mais próximo imediatamente — não marque uma consulta online para esta apresentação.</li>" +
    "<li>Emergências pediátricas — incluindo dificuldade respiratória, uma erupção que não desaparece quando pressionada (possível meningite), perda de consciência, reação alérgica grave, ou qualquer condição que se esteja a deteriorar rapidamente — exigem avaliação presencial de emergência imediata. Contacte o 112 imediatamente.</li>" +
    "</ul>",

  // 9
  "<h2>9. Serviços de Saúde do Viajante</h2>",
  "<p>Aplicam-se as seguintes limitações de âmbito especificamente às consultas de saúde do viajante:</p>",
  "<ul>" +
    "<li>Este serviço disponibiliza avaliação clínica pré-viagem e planeamento personalizado de vacinação. Não inclui administração física de vacinas.</li>" +
    "<li>A vacinação contra a febre amarela e o respetivo Certificado Internacional de Vacinação — exigido para entrada em determinados países — devem ser administrados e emitidos presencialmente num Centro de Vacinação Internacional autorizado pela Direção-Geral da Saúde (DGS). Este serviço não pode emitir esta certificação.</li>" +
    "<li>Após a consulta de saúde do viajante, o médico aconselha sobre que vacinas são recomendadas para o destino do doente e onde se dirigir para administração em Portugal.</li>" +
    "<li>A orientação de saúde específica de destino baseia-se nas orientações atuais da DGS e organismos internacionais de referência no momento da consulta. Os requisitos de saúde de viagem mudam — os doentes devem confirmar os requisitos de entrada atuais junto da embaixada ou consulado do país de destino antes de viajar.</li>" +
    "</ul>",

  // 10
  "<h2>10. Serviços de Aconselhamento Médico em Estética</h2>",
  "<p>Aplicam-se as seguintes limitações de âmbito especificamente às consultas de aconselhamento em medicina estética, quando disponibilizadas:</p>",
  "<ul>" +
    "<li>Este serviço disponibiliza apenas aconselhamento independente pré-procedimento e avaliação clínica pós-procedimento. Não prescreve, inicia, ou administra tratamentos estéticos.</li>" +
    "<li>Todos os procedimentos estéticos — incluindo toxina botulínica e preenchimentos dérmicos — exigem avaliação presencial e administração por um profissional devidamente qualificado. Este serviço não pode iniciar ou prescrever tratamento estético à distância.</li>" +
    "<li>Emergências pós-procedimento — incluindo inchaço grave que afete a via aérea, sinais de oclusão vascular (empalidecimento, dor intensa, alterações da cor da pele), ou reação alérgica grave — exigem avaliação presencial de emergência imediata. Contacte o 112 ou dirija-se ao serviço de urgência mais próximo imediatamente.</li>" +
    "</ul>",

  // 11
  "<h2>11. Registo Regulatório e Verificação</h2>",
  "<p>Aplicam-se os seguintes registos regulatórios aos serviços Global Health em Portugal:</p>",
  "<ul>" +
    '<li>Médicos — registados na Ordem dos Médicos. Números de cédula apresentados em todos os perfis de médico. Verificar em <a href="https://ordemdosmedicos.pt">ordemdosmedicos.pt</a>.</li>' +
    '<li>Médicos especialistas — registados no respetivo Colégio de Especialidade da Ordem dos Médicos. Verificar em <a href="https://ordemdosmedicos.pt">ordemdosmedicos.pt</a>.</li>' +
    '<li>Psicólogas — registadas na Ordem dos Psicólogos Portugueses. Verificar em <a href="https://ordemdospsicologos.pt">ordemdospsicologos.pt</a>.</li>' +
    '<li>Nutricionista — registada na Ordem dos Nutricionistas. Verificar em <a href="https://ordemdosnutricionistas.pt">ordemdosnutricionistas.pt</a>.</li>' +
    "<li>Padrões clínicos — alinhados com as orientações da Direção-Geral da Saúde (DGS) e da Entidade Reguladora da Saúde (ERS) para telemedicina.</li>" +
    '<li>Proteção de dados — supervisionada pela Comissão Nacional de Proteção de Dados (CNPD). Verificar em <a href="https://cnpd.pt">cnpd.pt</a>.</li>' +
    "</ul>",
  "<p>A entidade legal que opera os serviços Global Health em Portugal é a Global Guest s.r.o. (IČO: 19071680), registada na República Checa, operando em Portugal através de filial/entidade local registada junto da Entidade Reguladora da Saúde (ERS), e operando ainda na Irlanda, República Checa, Espanha, Roménia, e Brasil.</p>",

  // 12
  "<h2>12. Proteção de Dados e Confidencialidade</h2>",
  "<p>Todos os dados de doentes recolhidos através desta plataforma são processados em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD) e a Lei n.º 58/2019, que assegura a execução, na ordem jurídica portuguesa, do RGPD.</p>",
  "<p>Todas as consultas são realizadas por videochamada com encriptação ponto-a-ponto. Os registos clínicos são armazenados de forma segura, em conformidade com os requisitos portugueses de manutenção de registos médicos.</p>",
  "<p>A informação do doente não é partilhada com terceiros sem o consentimento explícito do doente, exceto quando exigido por lei — incluindo obrigações de proteção de menores, requisitos de notificação obrigatória, ou quando um risco sério para a vida ou segurança de terceiros exige divulgação.</p>",
  '<p>O doente tem o direito de aceder, retificar, e solicitar a eliminação dos seus dados pessoais, sujeito às obrigações legais e profissionais aplicáveis de manutenção de registos. Os pedidos de titular de dados podem ser dirigidos a <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a>.</p>',
  '<p>O nosso Encarregado de Proteção de Dados (EPD/DPO) é o Dr. Ahmed Maklad, contactável em <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a>.</p>',
  "<p>A Global Health está registada junto da Comissão Nacional de Proteção de Dados (CNPD). A nossa Política de Privacidade completa está disponível em myglobalhealth.online/privacy.</p>",

  // 13
  "<h2>13. Limitação de Responsabilidade</h2>",
  "<p>A Global Health e os seus profissionais clínicos exercem todo o cuidado e competência profissional razoáveis na prestação de serviços clínicos através desta plataforma. Aplicam-se as seguintes limitações de responsabilidade:</p>",
  "<ul>" +
    "<li>A avaliação clínica à distância tem limitações inerentes em comparação com a avaliação presencial. A Global Health e os seus profissionais clínicos não são responsáveis por resultados clínicos decorrentes das limitações inerentes da avaliação à distância, quando essas limitações foram claramente comunicadas e o profissional exerceu o cuidado e competência profissional razoáveis.</li>" +
    "<li>A Global Health não é responsável por resultados decorrentes da omissão, por parte do doente, de informação clínica relevante — historial médico, medicação atual, ou outra informação clinicamente significativa — durante uma consulta.</li>" +
    "<li>A Global Health não é responsável por resultados decorrentes do incumprimento, por parte do doente, de aconselhamento clínico ou orientações de segurança fornecidas durante uma consulta.</li>" +
    "<li>A Global Health não é responsável por resultados decorrentes da utilização de uma consulta online para uma apresentação que exija cuidados presenciais de emergência, quando a natureza emergente da apresentação era razoavelmente identificável ou foi identificada e comunicada pelo profissional clínico.</li>" +
    "</ul>",
  "<p>Nada neste disclaimer limita ou exclui a responsabilidade por morte ou danos pessoais decorrentes de negligência, fraude, ou qualquer outra responsabilidade que não possa ser limitada ou excluída ao abrigo da lei portuguesa.</p>",

  // 14
  "<h2>14. Reclamações</h2>",
  "<p>A Global Health está empenhada em prestar cuidados clínicos seguros e de elevada qualidade. Se tiver uma reclamação sobre qualquer aspeto do serviço recebido, contacte-nos em primeira instância:</p>",
  '<p>Email: <a href="mailto:reclamacoes@myglobalhealth.online">reclamacoes@myglobalhealth.online</a></p>',
  "<p>Confirmamos a receção da reclamação no prazo de 5 dias úteis e fornecemos uma resposta escrita completa no prazo de 30 dias úteis.</p>",
  "<p>Se não estiver satisfeito com a nossa resposta, pode dirigir a questão a:</p>",
  "<ul>" +
    '<li>Ordem dos Médicos — para reclamações sobre a conduta profissional de um médico registado: <a href="https://ordemdosmedicos.pt">ordemdosmedicos.pt</a></li>' +
    '<li>Ordem dos Psicólogos Portugueses — para reclamações sobre a conduta profissional de uma psicóloga registada: <a href="https://ordemdospsicologos.pt">ordemdospsicologos.pt</a></li>' +
    '<li>Ordem dos Nutricionistas — para reclamações sobre a conduta profissional de uma nutricionista registada: <a href="https://ordemdosnutricionistas.pt">ordemdosnutricionistas.pt</a></li>' +
    '<li>Comissão Nacional de Proteção de Dados — para reclamações sobre proteção de dados: <a href="https://cnpd.pt">cnpd.pt</a></li>' +
    '<li>Entidade Reguladora da Saúde — para questões de regulação de prestadores de cuidados de saúde: <a href="https://ers.pt">ers.pt</a></li>' +
    "</ul>",

  // 15
  "<h2>15. Informação de Contacto de Emergência — Portugal</h2>",
  '<p><strong>Emergência médica:</strong> contacte o <a href="tel:112">112</a>, ou dirija-se ao serviço de urgência mais próximo.</p>',
  "<p>Crise de saúde mental:</p>",
  "<ul>" +
    '<li>SNS 24 — <a href="tel:808242424">808 24 24 24</a> (gratuito, 24/7)</li>' +
    '<li>Linha Nacional de Prevenção do Suicídio e Apoio Psicológico — <a href="tel:1411">1411</a></li>' +
    '<li>SOS Voz Amiga — <a href="tel:213544545">213 544 545</a></li>' +
    "</ul>",
  "<p>Apoio emocional oncológico:</p>",
  '<ul><li>Liga Portuguesa Contra o Cancro — <a href="tel:808222555">808 222 555</a></li></ul>',
  '<p>Proteção de menores — se uma criança está em perigo imediato: contacte o <a href="tel:112">112</a>. CPCJ — Comissão de Proteção de Crianças e Jovens da sua área de residência.</p>',
  '<p>Este disclaimer é revisto e atualizado periodicamente. A versão apresentada na plataforma no momento da consulta é a versão aplicável. Para questões sobre este disclaimer, contacte-nos em <a href="mailto:info@myglobalhealth.online">info@myglobalhealth.online</a>.</p>',
  "<p><em>Global Health Portugal | myglobalhealth.online | © 2026 Global Guest s.r.o.</em></p>",
].join("");

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);

  console.log(
    `DISCLAIMER  /portugal/pt/legal/medical-disclaimer  "${DISCLAIMER_TITLE}"  (${DISCLAIMER_HTML.length} chars)`,
  );
  if (APPLY) {
    await prisma.countryLegalDocument.upsert({
      where: {
        countryId_type_locale: {
          countryId: country.id,
          type: LegalDocumentType.MEDICAL_DISCLAIMER,
          locale: LOCALE,
        },
      },
      create: {
        countryId: country.id,
        type: LegalDocumentType.MEDICAL_DISCLAIMER,
        title: DISCLAIMER_TITLE,
        content: DISCLAIMER_HTML,
        isPublished: true,
        publishedAt: new Date(),
        locale: LOCALE,
      },
      update: {
        title: DISCLAIMER_TITLE,
        content: DISCLAIMER_HTML,
        isPublished: true,
        publishedAt: new Date(),
        version: { increment: 1 },
      },
    });
  }

  console.log("\n────────────");
  console.log(APPLY ? "APPLIED." : "DRY-RUN (no writes). Pass --apply.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
