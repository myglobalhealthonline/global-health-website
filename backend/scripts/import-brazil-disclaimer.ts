/**
 * Create the Brazil Clinical & Liability Disclaimer (CountryLegalDocument,
 * MEDICAL_DISCLAIMER, locale "pt") from GlobalHealth_Disclaimer_Brazil.
 * Served at /brazil/pt/legal. Idempotent upsert.
 *
 * REGULATORY HOLD: the source document flags that Brazil's ANPD (national
 * data protection authority) registration is still in progress —
 * "ACTION REQUIRED: ANPD registration ... is in progress. Do NOT publish to
 * production until ANPD registration is confirmed." This script therefore
 * writes the row with isPublished: false. Do not flip it to published until
 * ANPD registration is confirmed.
 *
 *   node --env-file=.env --import tsx scripts/import-brazil-disclaimer.ts          # dry-run
 *   node --env-file=.env --import tsx scripts/import-brazil-disclaimer.ts --apply
 */
import { LegalDocumentType } from "@prisma/client";
import { prisma } from "../src/db/prisma.js";

const COUNTRY_CODE = "br";
const LOCALE = "pt";
const APPLY = process.argv.includes("--apply");

const DISCLAIMER_TITLE = "Declaração Clínica e de Responsabilidade";

const DISCLAIMER_HTML = [
  "<p>Esta Declaração Clínica e de Responsabilidade rege todos os serviços clínicos facilitados através da plataforma Global Health no Brasil, acessível em myglobalhealth.online. Ao agendar uma consulta ou utilizar qualquer serviço clínico através desta plataforma, o usuário reconhece que leu, compreendeu e aceita os termos estabelecidos neste documento.</p>",
  "<p>Este documento aplica-se a todos os serviços facilitados no Brasil. Aplicam-se declarações próprias aos serviços facilitados em outros mercados — Irlanda, Portugal, República Checa, Romênia e Espanha — disponíveis nas páginas respectivas de cada país desta plataforma.</p>",
  "<p><em>Última atualização: Julho 2026</em></p>",

  "<h2>⚠ Emergência médica — Leia primeiro</h2>",
  "<p><strong>As videoconsultas NÃO são adequadas para emergências médicas.</strong></p>",
  "<p>Se você ou alguém ao seu lado está passando por uma emergência médica — incluindo dor no peito, dificuldade para respirar, suspeita de AVC, perda de consciência, reação alérgica grave, ou qualquer situação que coloque a vida em risco — não agende uma consulta online.</p>",
  '<p><strong>Ligue para o SAMU — <a href="tel:192">192</a> — imediatamente, ou vá ao pronto-socorro mais próximo.</strong></p>',
  "<p>Recursos de saúde mental em crise:</p>",
  "<ul>" +
    '<li>CVV — Centro de Valorização da Vida — <a href="tel:188">188</a> (gratuito, 24 horas)</li>' +
    '<li>SAMU — Emergências — <a href="tel:192">192</a> (gratuito, 24 horas)</li>' +
    '<li>Violência ou abandono de idoso — Disque 100 — Direitos Humanos (24 horas)</li>' +
    "</ul>",

  "<h2>1. Natureza da plataforma e modelo de responsabilidade</h2>",
  "<p><strong>1.1 Global Health como plataforma de intermediação.</strong> myglobalhealth.online atua como plataforma de intermediação digital que conecta pacientes com profissionais de saúde independentes com CRM ativo no Brasil. A Global Health não presta diretamente serviços de saúde. Os serviços médicos são prestados pelos médicos independentes que operam através da plataforma, cada um sob seu próprio número de CRM e responsabilidade civil profissional.</p>",
  "<p>Este modelo enquadra-se na Lei 34/2002 de serviços da sociedade de informação e no Regulamento (UE) 2022/2065 de Serviços Digitais (DSA) como plataforma de intermediação. No Brasil, a prestação de serviços de telemedicina está regulada pela Resolução CFM 2.314/2022 e pela Lei 14.510/2022 (Lei da Telessaúde).</p>",
  "<p><strong>1.2 Responsabilidades da Global Health como plataforma.</strong> A Global Health é responsável por:</p>",
  "<ul>" +
    "<li>A verificação da colegiação e do CRM ativo de todos os médicos antes de autorizar sua operação na plataforma — consultando o registro do Conselho Regional de Medicina (CRM) competente</li>" +
    "<li>O funcionamento técnico da plataforma — incluindo a segurança das videochamadas, a criptografia de dados, e a integridade do sistema de documentação clínica</li>" +
    "<li>A gestão do sistema de receituário eletrônico conforme a Resolução CFM 2.299/2021 e os requisitos do ICP-Brasil</li>" +
    "<li>O tratamento de dados pessoais dos usuários em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018) e as normas da Autoridade Nacional de Proteção de Dados (ANPD)</li>" +
    "<li>A facturação e gestão administrativa do serviço</li>" +
    "</ul>",
  "<p><strong>1.3 Responsabilidades dos médicos independentes.</strong> Cada médico que opera através da plataforma é individualmente responsável por:</p>",
  "<ul>" +
    "<li>O ato médico prestado — incluindo a avaliação clínica, o diagnóstico diferencial, as recomendações clínicas e a documentação emitida</li>" +
    "<li>O cumprimento do Código de Ética Médica (Resolução CFM 2.217/2018) e da normativa sanitária aplicável à sua especialidade e ao Estado de registro</li>" +
    "<li>A manutenção do seu seguro de responsabilidade civil profissional</li>" +
    "<li>A manutenção do CRM ativo e do registro para telemedicina no conselho competente conforme a Resolução CFM 2.314/2022</li>" +
    "</ul>",
  "<p>A Global Health NÃO é responsável pelos atos médicos individuais prestados pelos médicos independentes que operam através da plataforma. A relação clínica estabelece-se diretamente entre o paciente e o médico. Não existe Diretor Clínico da Global Health para o mercado do Brasil.</p>",

  "<h2>2. Marco regulatório aplicável — Brasil</h2>",
  "<p><strong>Telemedicina e ato médico</strong></p>",
  "<ul>" +
    "<li>Resolução CFM 2.314/2022 — regulamenta a telemedicina no Brasil e estabelece as normas éticas para o atendimento médico remoto</li>" +
    "<li>Lei 14.510/2022 (Lei da Telessaúde) — lei federal que regulamenta a telessaúde em todo o território nacional e garante validade aos atos praticados remotamente</li>" +
    "<li>Resolução CFM 2.382/2024 — padroniza os campos obrigatórios dos documentos médicos emitidos digitalmente (atestados, receituários, pedidos de exames)</li>" +
    "<li>Resolução CFM 2.299/2021 — regulamenta a emissão de documentos médicos com certificação digital ICP-Brasil</li>" +
    "<li>Resolução CFM 2.217/2018 — Código de Ética Médica</li>" +
    "<li>Lei 8.080/1990 (Lei Orgânica da Saúde) — direito à informação e autonomia do paciente</li>" +
    "</ul>",
  "<p><strong>Proteção de dados</strong></p>",
  "<ul>" +
    "<li>Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018) — lei brasileira de proteção de dados pessoais</li>" +
    "<li>Autoridade Nacional de Proteção de Dados (ANPD) — autoridade supervisora em matéria de proteção de dados no Brasil</li>" +
    "</ul>",
  "<p><strong>Normativa específica aplicada neste documento</strong></p>",
  "<ul>" +
    "<li>Saúde reprodutiva — Código Penal Brasileiro (Arts. 124-128) — interrupção voluntária da gravidez ilegal exceto em 3 casos específicos previstos em lei</li>" +
    "<li>Proteção do menor — Lei 8.069/1990 (Estatuto da Criança e do Adolescente — ECA)</li>" +
    "<li>Internação psiquiátrica involuntária — Lei 10.216/2001 (Lei da Reforma Psiquiátrica) e Lei 13.146/2015</li>" +
    "<li>Atestado médico — CLT art. 473, Resolução CFM 2.382/2024, Lei 14.510/2022</li>" +
    "<li>Saúde do idoso — Lei 10.741/2003 (Estatuto do Idoso)</li>" +
    "<li>Cessação tabágica — Programa Nacional de Controle do Tabagismo (PNCT/INCA)</li>" +
    "<li>Saúde sexual — Protocolo Clínico e Diretrizes Terapêuticas (PCDT) IST do Ministério da Saúde</li>" +
    "</ul>",

  "<h2>3. Declaração geral — Todos os serviços</h2>",
  "<p>Todos os serviços clínicos facilitados através da Global Health para o mercado do Brasil são realizados em conformidade com a Resolução CFM 2.314/2022 e a Lei 14.510/2022, por médicos independentes com CRM ativo registrados para telemedicina no conselho competente.</p>",
  "<p>As avaliações clínicas realizadas por telemedicina são avaliações a distância. São realizadas com os mesmos padrões profissionais do atendimento presencial, mas têm limitações inerentes — o exame físico, determinados procedimentos diagnósticos e as intervenções urgentes não podem ser prestados de forma remota. O médico informa ao paciente de forma clara e imediata se a sua apresentação requer avaliação presencial.</p>",
  "<p>Nenhum resultado clínico — incluindo a emissão de receituário eletrônico, atestado médico, pedido de exames, ou qualquer outra documentação clínica — pode ser confirmado ou garantido antes da avaliação clínica completa.</p>",
  "<p>Todas as decisões clínicas são exclusivamente a critério do médico independente após avaliação clínica completa do paciente.</p>",

  "<h2>4. Serviços de medicina geral — Clínico geral</h2>",
  "<p>As consultas de medicina geral facilitadas através desta plataforma são realizadas por clínicos gerais independentes com CRM ativo e registrados para telemedicina conforme a Resolução CFM 2.314/2022. O número de CRM de cada médico é visível no perfil e verificável no portal do CFM (cfm.org.br).</p>",
  "<p><strong>Receituário eletrônico — ICP-Brasil.</strong> Os receituários emitidos por médicos através desta plataforma estão em conformidade com a Resolução CFM 2.299/2021 e são assinados digitalmente com certificado ICP-Brasil, tendo validade legal em farmácias em todo o território nacional.</p>",
  "<ul>" +
    "<li>Receita branca — medicamentos comuns. Válida em qualquer farmácia do Brasil</li>" +
    "<li>Receita de controle especial (receita azul) — benzodiazepínicos e outros psicotrópicos têm requisitos específicos de prescrição conforme a Portaria SVS/MS 344/1998. O médico informa o paciente sobre as limitações aplicáveis</li>" +
    "<li>Receita amarela — entorpecentes (morfina, codeína e outros) NÃO podem ser prescritos eletronicamente conforme a legislação brasileira vigente. Requerem receituário em papel com talonário específico</li>" +
    "<li>Validade: 10 dias corridos para a primeira dispensação em receitas comuns; receitas de controle especial têm validade e número de vias específicos conforme a Portaria 344/1998</li>" +
    "</ul>",
  "<p><strong>Atestado médico — validade legal.</strong> Os atestados médicos emitidos por telemedicina têm a mesma validade legal que os emitidos presencialmente, conforme a Resolução CFM 2.382/2024 e a Lei 14.510/2022. Empregadores são legalmente obrigados a aceitar atestados médicos válidos conforme o art. 473 da CLT, confirmado pelo TRT-SP em 2024.</p>",
  "<ul>" +
    "<li>O atestado médico para fins de perícia do INSS (afastamento previdenciário) requer avaliação presencial por médico perito do INSS — não pode ser emitido por telemedicina</li>" +
    "<li>A emissão do atestado é sempre a critério do médico após avaliação clínica completa — nenhum atestado pode ser garantido antes da consulta</li>" +
    "</ul>",
  "<p><strong>O que este serviço NÃO pode proporcionar</strong></p>",
  "<ul>" +
    "<li>Encaminhamento pelo SUS — requer médico vinculado à rede pública</li>" +
    "<li>Perícia médica do INSS — requer avaliação presencial por médico perito</li>" +
    "<li>Receituário de entorpecentes (receita amarela) — não pode ser emitido eletronicamente</li>" +
    "<li>Vacinação — requer presencialidade em unidade de saúde autorizada</li>" +
    "<li>Vacina da febre amarela e Certificado Internacional de Vacinação — requer presencialidade em posto autorizado pela Direção Geral de Saúde Pública</li>" +
    "<li>Atendimento de urgências — para qualquer urgência ligue ao SAMU (192) imediatamente</li>" +
    "<li>Intervenções cirúrgicas ou procedimentos invasivos — requerem presencialidade hospitalar</li>" +
    "</ul>",

  "<h2>5. Declarações específicas por serviço</h2>",
  "<p><strong>5.1 Atestado médico e saúde ocupacional.</strong> O atestado médico emitido por telemedicina é legalmente válido conforme a Resolução CFM 2.382/2024 e a Lei 14.510/2022 e deve ser aceito por empregadores conforme o art. 473 da CLT. A recusa de atestado médico válido por parte do empregador constitui infração trabalhista, conforme confirmado pelo TRT-SP em 2024. O atestado para fins de perícia do INSS requer avaliação presencial — não pode ser emitido por telemedicina. LER/DORT podem ser avaliados e documentados por telemedicina para fins de atestado ao empregador, mas não para fins periciais do INSS.</p>",
  "<p><strong>5.2 Saúde mental.</strong> Este serviço realiza avaliação e rastreamento de saúde mental a nível de clínica geral — não é um serviço de intervenção em crise. Não é adequado para situações de crise ativa de suicídio ou autolesão — em crise, ligue ao CVV (188) ou ao SAMU (192). A internação psiquiátrica involuntária está regulada pela Lei 10.216/2001 e requer avaliação presencial e processo judicial — não pode ser iniciada por telemedicina. Os dados de saúde mental têm proteção reforçada como categoria especial de dados conforme a LGPD.</p>",
  "<p><strong>5.3 Saúde da mulher.</strong> A interrupção voluntária da gravidez (IVG) no Brasil é permitida por lei apenas em três casos específicos — gravidez resultante de estupro, risco de vida para a gestante, e anencefalia fetal (STF, ADPF 54/2012). Fora desses casos, é ilegal no Brasil. Este serviço NÃO pode orientar, facilitar ou encaminhar para procedimentos de interrupção voluntária da gravidez fora dos casos expressamente previstos em lei. A anticoncepção hormonal e outras prescrições ginecológicas são a critério do médico após avaliação completa do perfil clínico individual. Migrânea com aura em mulheres que usam anticoncepcionais hormonais combinados requer avaliação individualizada pelo risco cardiovascular aumentado.</p>",
  "<p><strong>5.4 Saúde de viagem.</strong> A vacina da febre amarela e o Certificado Internacional de Vacinação requerem administração e emissão presencial em posto de vacinação autorizado — não podem ser obtidos por telemedicina. A administração de qualquer vacina requer presencialidade. A profilaxia de malária e outras recomendações farmacológicas para viagem são a critério do médico após avaliação do itinerário e do perfil clínico individual. As recomendações baseiam-se nas informações disponíveis no momento da consulta — os riscos de saúde em destinos específicos podem mudar.</p>",
  "<p><strong>5.5 Saúde sexual e IST.</strong> A PEP (profilaxia pós-exposição ao HIV) deve ser iniciada no máximo dentro de 72 horas após exposição de risco — se não conseguir teleconsulta imediata, vá ao pronto-socorro ou UPA mais próximo. A PrEP (profilaxia pré-exposição ao HIV) está disponível gratuitamente pelo SUS para pessoas elegíveis — o médico orienta sobre como acessar o programa público. O tratamento da sífilis com penicilina benzatina requer administração intramuscular presencial — o médico emite a prescrição e orienta onde realizar. Os dados de saúde sexual têm proteção reforçada adicional como categoria sensível conforme a LGPD. O rastreamento de IST por teleconsulta inclui avaliação de risco e pedido de painel laboratorial — o diagnóstico definitivo requer resultado dos exames.</p>",
  "<p><strong>5.6 Controle de peso.</strong> Os resultados variam entre indivíduos e não estão garantidos. Opções farmacológicas — incluindo análogos do GLP-1 (semaglutida/Ozempic), orlistate, bupropiona e outros — são avaliadas a critério do médico após avaliação clínica completa e exclusão de contraindicações. Nenhuma medicação pode ser confirmada ou prescrita antes da consulta. Anfepramona, femproporex e mazindol são medicamentos de controle especial com indicação restrita.</p>",
  "<p><strong>5.7 Cessação tabágica.</strong> Os resultados variam entre indivíduos e não estão garantidos. O Programa Nacional de Controle do Tabagismo (PNCT) do INCA oferece tratamento gratuito pelo SUS para fumantes que cumpram critérios específicos — o médico informa sobre elegibilidade durante a consulta. O tratamento farmacológico — incluindo vareniclina (Champix), bupropiona e TRN — é a critério do médico após avaliação completa e exclusão de contraindicações. O tratamento durante a gravidez requer avaliação específica — algumas opções são contraindicadas.</p>",
  "<p><strong>5.8 Pele e queda de cabelo.</strong> A avaliação dermatológica por imagem de alta resolução permite avaliação clínica de qualidade para a maioria das queixas comuns — não substitui a dermatoscopia presencial de contato nem a biópsia para o diagnóstico definitivo de lesões suspeitas de malignidade. Onde há suspeita clínica significativa, o médico encaminha para dermatologista com urgência no mesmo dia. Os resultados do tratamento de queda de cabelo variam entre indivíduos e não podem ser garantidos. A finasterida, dutasterida e o minoxidil oral requerem receita médica — a avaliação de indicação e contraindicações é parte essencial da consulta.</p>",
  "<p><strong>5.9 Saúde do idoso.</strong> Este serviço realiza avaliação geriátrica básica a nível de clínica geral — não substitui a avaliação geriátrica especializada completa presencial quando necessária. O rastreamento cognitivo por videochamada permite identificar quando a avaliação especializada é indicada — não substitui o diagnóstico formal de demência, que requer avaliação presencial completa. Os profissionais clínicos são obrigados por lei a comunicar situações de violência, negligência ou abandono de idosos às autoridades competentes conforme o Estatuto do Idoso (Lei 10.741/2003) — esta obrigação prevalece sobre a confidencialidade.</p>",
  "<p><strong>5.10 Pediatria.</strong> É obrigatória a presença de um dos pais ou responsável legal durante toda a consulta para menores de 16 anos, conforme a Lei 8.069/1990 (Estatuto da Criança e do Adolescente — ECA). A febre em bebê com menos de 3 meses requer avaliação presencial urgente imediata — não é adequada para teleconsulta em nenhuma circunstância. Os profissionais são obrigados por lei a comunicar situações de possível abandono ou maus-tratos ao menor conforme o ECA — esta obrigação prevalece sobre a confidencialidade.</p>",
  "<p><strong>5.11 Musculoesquelético.</strong> A síndrome da cauda equina — dor lombar com perda de força nas pernas, dormência na região perineal, ou dificuldade para urinar ou evacuar — é uma emergência cirúrgica. Ligue ao SAMU (192) imediatamente. Articulação muito inchada, vermelha e quente com febre pode ser artrite séptica, emergência médica — vá ao pronto-socorro imediatamente.</p>",
  "<p><strong>5.12 Segunda opinião.</strong> A segunda opinião médica é uma avaliação clínica independente baseada na documentação disponível e na avaliação por videochamada — não substitui a avaliação presencial quando esta for necessária. O direito à segunda opinião está garantido pelo Código de Ética Médica (Resolução CFM 2.217/2018) e pela Lei 8.080/1990.</p>",

  "<h2>6. Menores de idade</h2>",
  "<p>As consultas que envolvam menores de idade regem-se pela Lei 8.069/1990 (Estatuto da Criança e do Adolescente — ECA):</p>",
  "<ul>" +
    "<li>Para menores de 16 anos — é obrigatória a presença e o consentimento de um dos pais ou responsável legal durante toda a consulta</li>" +
    "<li>Para maiores de 16 anos — o médico avalia a capacidade de consentir individualmente com base no princípio do menor maduro</li>" +
    "<li>Os profissionais clínicos são obrigados por lei a comunicar situações de possível maus-tratos, abandono ou violência contra menor às autoridades competentes — Conselho Tutelar ou Ministério Público. Esta obrigação legal prevalece sobre a confidencialidade</li>" +
    "<li>A febre em bebê com menos de 3 meses é uma emergência médica que requer avaliação presencial urgente imediata — não é adequada para teleconsulta</li>" +
    "</ul>",

  "<h2>7. Saúde mental — Recursos de crise</h2>",
  "<p>Os serviços de saúde mental facilitados através desta plataforma não são serviços de intervenção em crise. Se você está em crise ou com pensamentos de suicídio ou autolesão, busque apoio imediatamente:</p>",
  "<ul>" +
    '<li>CVV — Centro de Valorização da Vida — <a href="tel:188">188</a> (gratuito, 24 horas, 7 dias)</li>' +
    '<li>SAMU — Emergências — <a href="tel:192">192</a> (gratuito, 24 horas)</li>' +
    "<li>CAPS — Centro de Atenção Psicossocial da sua cidade</li>" +
    "</ul>",
  '<p><strong>Urgências neurológicas:</strong> sintomas de AVC — perda de força, alteração da fala ou visão, cefaleia brusca intensa — ligue ao SAMU (<a href="tel:192">192</a>) imediatamente. O tempo é crítico.</p>',
  '<p><strong>Urgências cardíacas:</strong> dor no peito, perda de consciência, dificuldade respiratória grave — ligue ao SAMU (<a href="tel:192">192</a>) imediatamente.</p>',
  '<p><strong>Urgências pediátricas:</strong> febre em bebê com menos de 3 meses, dificuldade respiratória, manchas vermelhas que não somem ao apertar — ligue ao SAMU (<a href="tel:192">192</a>) imediatamente.</p>',
  "<p><strong>Proteção de menores e idosos:</strong> Disque 100 — Direitos Humanos (24 horas). Conselho Tutelar do município — violência ou abandono de menor.</p>",

  "<h2>8. Proteção de dados e confidencialidade</h2>",
  "<p>Todos os dados pessoais dos pacientes recolhidos através desta plataforma são processados pela Global Guest s.r.o. (IČO: 19071680) na qualidade de responsável pelo tratamento, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).</p>",
  "<ul>" +
    "<li>Os dados de saúde são dados sensíveis conforme o art. 11 da LGPD e requerem consentimento expresso do paciente para o seu tratamento</li>" +
    "<li>Os dados de saúde mental e de saúde sexual têm proteção reforçada adicional como categoria sensível</li>" +
    "<li>Todas as consultas são realizadas por videochamada com criptografia de ponta a ponta. Os registros clínicos são armazenados de forma segura</li>" +
    "<li>As informações do paciente não são partilhadas com terceiros sem consentimento expresso, exceto quando exigido por lei</li>" +
    '<li>O paciente tem direito de acesso, retificação, eliminação, portabilidade e oposição ao tratamento dos seus dados pessoais — solicitações podem ser dirigidas a: <a href="mailto:dpo@myglobalhealth.online">dpo@myglobalhealth.online</a></li>' +
    "</ul>",

  "<h2>9. Verificação de profissionais e registro regulatório</h2>",
  "<p>Os seguintes organismos reguladores aplicam-se aos profissionais que operam através da Global Health no Brasil:</p>",
  "<ul>" +
    '<li>Médicos clínicos gerais — CRM ativo no Conselho Regional de Medicina do Estado de registro. Verificável em <a href="https://cfm.org.br">cfm.org.br</a></li>' +
    "<li>Registro para telemedicina — informado ao CRM competente conforme a Resolução CFM 2.314/2022</li>" +
    "<li>Receituário eletrônico — assinatura digital ICP-Brasil conforme a Resolução CFM 2.299/2021</li>" +
    "<li>Atestados e documentos — emitidos conforme a Resolução CFM 2.382/2024</li>" +
    "<li>Proteção de dados — supervisionada pela ANPD. Registro pendente (ver seção 8)</li>" +
    "</ul>",
  "<p>A entidade legal que opera a Global Health no Brasil é a Global Guest s.r.o. (IČO: 19071680), constituída na República Checa, prestando serviços de plataforma de intermediação de telemedicina em conformidade com a normativa brasileira e europeia aplicável, operando simultaneamente na Irlanda, Portugal, República Checa, Romênia e Espanha.</p>",

  "<h2>10. Limitação de responsabilidade</h2>",
  "<ul>" +
    "<li>A Global Health não é responsável pelos atos médicos individuais prestados pelos médicos independentes que operam através da plataforma, onde esses profissionais atuam sob a própria responsabilidade civil profissional</li>" +
    "<li>Os médicos independentes não são responsáveis por resultados clínicos decorrentes das limitações inerentes da avaliação a distância, quando essas limitações foram comunicadas claramente e o profissional atuou com diligência e competência razoáveis</li>" +
    "<li>A Global Health não é responsável por resultados decorrentes da omissão por parte do paciente de informações clínicas relevantes durante a consulta</li>" +
    "<li>Nada nesta declaração limita ou exclui a responsabilidade por morte ou lesões pessoais decorrentes de negligência, fraude ou qualquer outra responsabilidade que não possa ser limitada ou excluída conforme a legislação brasileira</li>" +
    "</ul>",

  "<h2>11. Reclamações</h2>",
  '<p>Se tiver uma reclamação sobre qualquer aspeto do serviço recebido, contacte-nos em primeira instância: <a href="mailto:reclamacoes@myglobalhealth.online">reclamacoes@myglobalhealth.online</a>. Confirmamos o recebimento em 5 dias úteis e fornecemos resposta escrita completa em 30 dias úteis.</p>',
  "<p>Se não estiver satisfeito com a nossa resposta, pode dirigir a sua reclamação a:</p>",
  "<ul>" +
    '<li>Conselho Federal de Medicina (CFM) — conduta profissional de médico com CRM: <a href="https://cfm.org.br">cfm.org.br</a></li>' +
    "<li>Conselho Regional de Medicina do Estado competente — CRM estadual do médico</li>" +
    '<li>Autoridade Nacional de Proteção de Dados (ANPD) — proteção de dados: <a href="https://gov.br/anpd">gov.br/anpd</a></li>' +
    '<li>PROCON — reclamações de consumo: <a href="https://procon.sp.gov.br">procon.sp.gov.br</a> ou equivalente estadual</li>' +
    "</ul>",

  "<h2>12. Recursos de urgência e crise — Brasil</h2>",
  '<p><strong>Emergências médicas:</strong> SAMU — <a href="tel:192">192</a> (gratuito, 24 horas, disponível em todo o Brasil). Bombeiros — <a href="tel:193">193</a>.</p>',
  '<p><strong>Saúde mental em crise:</strong> CVV — <a href="tel:188">188</a> (gratuito, 24 horas).</p>',
  '<p><strong>Urgências neurológicas:</strong> sintomas de AVC — <a href="tel:192">SAMU (192)</a> imediatamente. Em neurologia, o tempo é crítico.</p>',
  '<p><strong>Urgências cardíacas:</strong> dor no peito, perda de consciência, dificuldade respiratória grave — <a href="tel:192">SAMU (192)</a> imediatamente.</p>',
  '<p><strong>Urgências pediátricas:</strong> febre em bebê com menos de 3 meses — pronto-socorro imediatamente. Manchas vermelhas que não somem ao apertar com um copo — <a href="tel:192">SAMU (192)</a> (possível meningite). Dificuldade respiratória em criança — <a href="tel:192">SAMU (192)</a> imediatamente.</p>',
  "<p><strong>Proteção de menores e idosos:</strong> Disque 100 — Direitos Humanos (24 horas, gratuito). Conselho Tutelar do município — violência ou abandono de menor.</p>",

  '<p>Esta declaração foi atualizada pela última vez em julho de 2026. A Global Health reserva-se o direito de atualizá-la a qualquer momento. A versão publicada na plataforma no momento da consulta é a versão aplicável. Para consultas sobre esta declaração: <a href="mailto:info@myglobalhealth.online">info@myglobalhealth.online</a>.</p>',
  "<p><em>Global Health Brasil | myglobalhealth.online | Global Guest s.r.o. (IČO: 19071680)</em></p>",
].join("");

async function main() {
  const country = await prisma.country.findUnique({
    where: { code: COUNTRY_CODE },
    select: { id: true },
  });
  if (!country) throw new Error(`Country ${COUNTRY_CODE} not found`);

  console.log(
    `DISCLAIMER  /brazil/pt/legal  "${DISCLAIMER_TITLE}"  (${DISCLAIMER_HTML.length} chars)`,
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
        isPublished: false, // ANPD registration pending — see header note
        locale: LOCALE,
      },
      update: {
        title: DISCLAIMER_TITLE,
        content: DISCLAIMER_HTML,
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
