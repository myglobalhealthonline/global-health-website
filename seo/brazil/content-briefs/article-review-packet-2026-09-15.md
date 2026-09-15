# Brazil articles — review packet for Dr. Renato Sarmento (15 September 2026)

Read-only investigation. Nothing applied. Quotes are from **rendered** public text;
replacement strings for a runner must be re-cut from the stored HTML snapshot.
Status: BLOCKED on owner facts (see end). Tags: [S] speed · [L] legal/signing ·
[SV] service claim · [C] clinical check · [A] attribution · OWNER = needs a fact.

## Storage and guard

- One `BlogPost` row per article (base PT: body, SEO, `authorDoctorId`,
  `reviewerDoctorId`, `lastReviewedAt`); EN/ES in `BlogTranslation.content`/`seoTitle`/`seoDesc`.
  Author/reviewer/date are on the base row, shared by all locales. CS/DE/RO rows
  exist (their /brazil URLs 308 to PT) and carry the same claims.
- FAQ schema is generated from `<details class="faq-item">` in the body
  (`frontend/lib/seo/article-faqs.ts`); author cards/disclaimers are in the body.
  Visible byline is hard-coded "Global Health Medical Team"
  (`frontend/lib/content/blog-byline.ts`); "Clinically reviewed by" uses `reviewerDoctor`.
- Not gated: `reviewedRomaniaTransaction` does not cover blogs;
  `backend/src/modules/blog/blog.service.ts` `updateAdminBlogPost` sets
  `lastReviewedAt = new Date()` on PUBLISHED — do not use the admin form.
- Needed: guarded runner like `backend/scripts/patch-internal-links.mjs` covering
  body, seoDescription/seoDesc, author/reviewer ids, explicit `lastReviewedAt`,
  translation content; plus a blog approval gate.
- Policy page is code: `frontend/app/[country]/[lang]/blog/medical-review-policy/page.tsx`
  + `locales/{pt,en,es}/company.json` → `medicalReview`; needs a Brazil branch.

Current attribution (public API):

| Article | author | reviewer | lastReviewedAt |
|---|---|---|---|
| Attendance certificate | — | Renato (CRM 170837) | 2026-09-07 |
| Lab test request | Renato | Tiago (IMC 523449, Ireland) | 2026-08-07 |
| Online medical certificate | Renato | Khoiamul Islam (ČLK, Czechia) | 2026-08-07 |
| Diabetes | Tiago (IMC; body "OM 77986") | Renato | 2026-07-21 |

## A. Attendance certificate (atestado de comparecimento)

| # | Current (PT) | Proposed (PT) |
|---|---|---|
| A1 [L][SV] OWNER | "Na Global Health, a consulta clínica online segue essa regra: o médico emite a declaração de comparecimento e, quando avalia incapacidade, o atestado médico online com assinatura digital." | "Na Global Health, o médico avalia a necessidade de cada documento. Confirme com o médico, na consulta, como o documento será emitido e disponibilizado." |
| A2 [L] | "Precisa de avaliação médica com documento válido?" / "Consulta com médico registrado, declaração de comparecimento e, se houver incapacidade, atestado assinado com certificado ICP-Brasil." | "Precisa de avaliação médica?" / "Consulta por vídeo com médico registrado no CRM. A emissão de qualquer documento depende da avaliação clínica; a consulta não garante um documento nem sua aceitação." |
| A3 [L] FAQ | "Sim, com assinatura digital ICP-Brasil, nome e CRM do médico, data e hora, conforme a Resolução CFM 2.314/2022. O atestado de afastamento depende da avaliação clínica." | "Você pode pedir a declaração de comparecimento ao médico ao final da consulta. Confirme com o médico como o documento será emitido. O atestado de afastamento depende da avaliação clínica." |
| A4 [L] | Sentence citing "Resolução CFM 2.314/2022, art. 13" + ICP-Brasil | Legal check; else "a Resolução CFM 2.314/2022 estabelece requisitos adicionais para documentos emitidos em telemedicina" |
| A5 [A] | "Revisto pela equipa médica da Global Health." | Delete |
| A6 OWNER/legal | Lei 15.377/2026, TRT-18 ruling, CLT art. 473 X/XI/XII, Lei 14.457/2022 | Verify sources |

EN/ES equivalents: see the full tables in the 15 Sep investigation (EN "At Global
Health, the doctor assesses whether each document is needed…"; ES "En Global
Health, el médico evalúa si cada documento es necesario…"). Translate the PT
proposal 1:1; ES uses Brazil-appropriate terms.

## B. Lab test request

| # | Current (PT) | Proposed (PT) |
|---|---|---|
| B1 [L] OWNER | "Ela pode ser emitida em papel ou em PDF com assinatura digital, aceita pelos laboratórios do mesmo modo — o Conselho Federal de Medicina mantém plataforma própria para isso." | "Ela pode ser emitida em papel ou em formato digital. Antes de agendar a coleta, confirme com o laboratório os requisitos do pedido e os custos." |
| B2 [L] chip | "Vale em PDF com assinatura digital" | "Confirme os requisitos com o laboratório" |
| B3 [L][S] callout | "Pedido digital tem o mesmo valor" / "Um PDF assinado digitalmente é um documento válido e os laboratórios o recebem por e-mail ou aplicativo de mensagens. A autenticidade é conferida pela assinatura eletrônica, não pelo papel. Se o laboratório tiver dúvida, a verificação é pública e leva menos de um minuto." | "Pedido digital: confirme com o laboratório" / "Laboratórios e planos podem ter requisitos próprios para pedidos digitais. Antes de agendar, confirme se o pedido será aceito no formato em que você o recebeu e quais são os custos." |
| B4 [L] meta | "…como funciona em PDF assinado digitalmente e quando o exame é feito sem pedido." | "…o que confirmar com o laboratório e quando o exame é feito sem pedido." |
| B5 [L] | "Como funciona a solicitação digital e como qualquer pessoa confere a assinatura." | "O que confirmar com o laboratório antes de usar um pedido digital." |
| B6 [S] | "O circuito é simples e cabe em uma tarde." | "O circuito tem quatro etapas." |
| B7 [L] | "Emissão do pedido em PDF, assinado digitalmente, enviado para você." | "Se o médico indicar exames, emissão do pedido; confirme com o médico como ele será disponibilizado." |
| B8 [SV] OWNER | "Uma consulta por vídeo define a pergunta clínica, emite a solicitação com os exames certos para o seu caso e agenda o retorno para interpretar os resultados." | "Uma consulta por vídeo define a pergunta clínica e, se houver indicação, o médico emite a solicitação. O retorno para interpretar os resultados é agendado à parte." |
| B9 [SV][L] | "Nossos médicos no Brasil definem com você quais exames fazem sentido, emitem a solicitação assinada digitalmente e interpretam os resultados no retorno." | "O médico avalia com você se os exames são necessários e pode interpretar os resultados em uma consulta de retorno." |
| B10 [L] FAQ | "Sim. Um pedido assinado digitalmente tem o mesmo valor do impresso e é aceito pelos laboratórios; pode chegar por e-mail ou aplicativo de mensagens. A autenticidade é conferida pela assinatura eletrônica, que qualquer pessoa valida em validar.iti.gov.br." | "O médico avalia se os exames são necessários. Antes de agendar a coleta ou o exame, confirme com o laboratório ou a clínica os requisitos do pedido e os custos." (phase-4 wording) |
| B11 [L] FAQ | "Sim, quando há razão clínica para os exames. A consulta define a pergunta a responder, o pedido é emitido em PDF assinado digitalmente e você coleta no laboratório de sua escolha. O retorno com os resultados faz parte do processo — é nele que os números viram conduta." | "Quando há razão clínica para os exames, o médico pode emitir a solicitação. Antes de agendar a coleta, confirme com o laboratório os requisitos do pedido e os custos. Uma consulta de retorno com os resultados é o que transforma números em conduta." |
| B12 [A] OWNER | "Escrito pelo Dr. Renato Sarmento, médico de família e comunidade da Global Health Brasil." | "Revisado clinicamente pelo Dr. Renato Sarmento (CRM-PA 11426 · RQE 8822, Medicina de Família e Comunidade)." |
| B13 [C] | "fora da faixa" statistic, critical-result "no mesmo dia" safety advice, emergency list | Renato to check (safety advice, not a promise) |

## C. Online medical certificate

| # | Current (PT) | Proposed (PT) |
|---|---|---|
| C1 [L] lede | "O atestado emitido em teleconsulta vale para o trabalho quando há consulta de verdade, médico inscrito no CRM e assinatura digital verificável." | "Um atestado emitido em teleconsulta exige consulta real e avaliação do médico." |
| C2 [L] | "Um atestado médico emitido em teleconsulta tem a mesma validade de um emitido presencialmente, desde que atenda às mesmas condições… qualquer pessoa pode validá-la em um site público do governo." | "A telemedicina é regulamentada no Brasil, mas nenhuma consulta garante a emissão de um atestado nem a sua aceitação. O atestado depende de consulta médica real, de médico regularmente inscrito no CRM e dos dados exigidos no documento. Confirme com o destinatário — empregador, escola ou INSS — os requisitos aplicáveis ao seu caso." |
| C3 [L] chips | "Vale quando há consulta de verdade" / "Assinatura digital, não carimbo" | "Só existe com consulta de verdade" / "Confirme os requisitos com o destinatário" |
| C4 [L] | "Tem — e a razão é simples: o que dá validade ao atestado é o ato médico, não o meio pelo qual ele aconteceu." | "O que importa é o ato médico: sem avaliação clínica, não há atestado." |
| C5 [L] | "Se o médico avaliou você, concluiu que há necessidade de afastamento e emitiu o documento com os dados exigidos e assinatura digital, o atestado é o mesmo documento que sairia de um consultório." | "Se o médico avaliou você e concluiu que há necessidade de afastamento, pode emitir o documento com os dados exigidos." |
| C6 [L] OWNER | "Assinatura digital com certificado válido, verificável por qualquer pessoa." | "Assinatura do médico no formato exigido para o documento." |
| C7 [L] OWNER | "Não existe hoje uma plataforma central obrigatória para validar atestados… é encaminhado por você ao empregador." | "As regras sobre plataformas de emissão e validação de atestados podem mudar. Confirme com o médico como o seu documento será emitido e com o destinatário como ele será conferido." (drop "Prescrição eletrônica do CFM" source) |
| C8 [L] | "A verificação de um atestado digital é feita pela assinatura eletrônica… leva ao mesmo resultado." | "Quando o documento é assinado digitalmente, a assinatura pode ser conferida em validar.iti.gov.br, o serviço público de validação de assinaturas digitais." |
| C9 [L] | "A empresa não pode condicionar a aceitação a um formato de papel específico quando o documento digital é autêntico." | Delete |
| C10 [L] | "A assinatura digital é justamente o que torna a fraude fácil de detectar: um documento sem assinatura válida não passa na verificação." | Delete |
| C11 [S][L] | "Um atestado autêntico custa uma consulta e alguns minutos. Um atestado falso custa o emprego." / "Se o seu quadro justificar afastamento, o atestado sai." | "Um atestado autêntico exige uma consulta e avaliação médica. Um atestado falso pode custar o emprego." / "Se o médico avaliar que o seu quadro justifica afastamento, pode emitir o atestado." |
| C12 [L] | "é motivo de demissão por justa causa" | "pode ser motivo de demissão por justa causa" |
| C13 [S] | "Nossos médicos no Brasil avaliam por vídeo e dizem com clareza o que a consulta pode resolver hoje e o que precisa de avaliação presencial." | "O médico avalia por vídeo e diz com clareza o que a consulta pode resolver e o que precisa de avaliação presencial." |
| C14 [S][L] CTA | "Precisa de avaliação hoje?" / "Uma consulta por vídeo avalia o seu quadro, inicia tratamento quando indicado e emite o atestado se o afastamento se justificar — com assinatura digital verificável." | "Precisa de avaliação médica?" / "Agende uma avaliação médica por vídeo. A emissão de atestado depende da avaliação clínica; a consulta não garante um documento ou sua aceitação." |
| C15 [L] FAQ | "Sim, quando resulta de uma consulta efetivamente realizada… não o meio pelo qual a consulta aconteceu." | "A consulta não garante a emissão de um atestado nem sua aceitação. O médico avalia a necessidade do documento. Confirme com o destinatário os requisitos aplicáveis ao seu caso." |
| C16 [L] FAQ | "Um atestado autêntico não deixa de valer por ser digital… nem exigir o seu diagnóstico." | "A empresa pode verificar a autenticidade do documento e a inscrição do médico no CRM, mas não pode exigir o seu diagnóstico. Confirme com a empresa os requisitos de entrega aplicáveis." |
| C17 [L] FAQ | "Pela assinatura digital. O PDF pode ser verificado em validar.iti.gov.br… QR Code ou código de verificação." | "Pela inscrição do médico na busca de médicos do CFM e, quando o documento é assinado digitalmente, pela verificação da assinatura em validar.iti.gov.br." |
| C18 [L] meta | "…quando vale para o trabalho, o que precisa conter, como a empresa confere a assinatura digital e quando não cabe." | "…o que precisa conter, como a empresa pode conferir e quando a teleconsulta não deve emitir." |
| C19 [A] | "Escrito pelo Dr. Renato Sarmento…" | As B12 |

## D. Diabetes

| # | Current (PT) | Proposed (PT) |
|---|---|---|
| D1 [A] meta | "Escrito por médico especialista." | Delete |
| D2 [A] OWNER card | "Escrito pelo Dr. Tiago Miguel Figueira", "OM 77986", "Diretor Clínico", "CRM 170837/SP", "10 MIN LEITURA", "Revisto pela equipa médica da Global Health." | "Revisão clínica: Dr. Renato Sarmento · CRM-PA 11426 · RQE 8822" |
| D3 [A] | "Escrito pelo Dr. Tiago Miguel Figueira (OM 77986) e revisado clinicamente pelo Dr. Renato Sarmento (CRM 170837/SP), Diretor Clínico da Global Health." / "atualizadas até junho de 2026" | "Revisado clinicamente pelo Dr. Renato Sarmento (CRM-PA 11426 · RQE 8822)." / "atualizadas até [data da revisão]" OWNER |
| D4 [A] OWNER | "Publicado em Junho de 2026" / "Atualizado em Junho de 2026" (stored publishedAt 20 Jul) | Real review date or delete |
| D5 [L] | "Alinhado com o Ministério da Saúde e a SBD" | "Com base em fontes do Ministério da Saúde e da SBD" |
| D6 [SV][L] FAQ OWNER | "Sim. A Global Health oferece consultas de clínica geral online… globalhealth@myglobalhealth.online." | "Sim. A Global Health oferece consultas online com médico registrado no CRM para acompanhamento de doenças crônicas, incluindo diabetes. O médico avalia se exames ou prescrição são necessários. Antes de comprar um medicamento ou agendar um exame, confirme os requisitos com a farmácia, o laboratório ou a clínica. Agende sua consulta em myglobalhealth.online." |
| D7 [S][SV] CTA | "Tem dúvidas sobre diabetes? Fale hoje com um médico." / "…Prescrição digital em conformidade com o CFM. Disponível em português, inglês, espanhol e mais." | "Tem dúvidas sobre diabetes? Fale com um médico." / "Consultas online com médico registrado no CRM, em português, inglês e espanhol. A prescrição depende da avaliação clínica." |
| D8 [C] | "e cerca de 13 milhões de pessoas com diabetes convivendo com úlceras nos pés" | Delete clause (implausible vs 16.6M) |
| D9 [C] | "(PMID: PMC12689004)" | "(PMCID: PMC12689004)" — ID unverified |
| D10 [C] | "O Diabetes Research Institute da Universidade de Miami demonstrou prova de conceito em ensaios clínicos, com o primeiro paciente atingindo independência de insulina." | "Grupos de pesquisa, como o Diabetes Research Institute da Universidade de Miami, estudam essa abordagem em ensaios clínicos." |
| D11 [C] | "…embora as terapias com células-tronco em ensaios clínicos prometam restaurar a produção de insulina nos próximos anos." | "…embora terapias com células-tronco estejam em estudo em ensaios clínicos." |
| D12 [C] | "as opções clínicas disponíveis no Brasil são hoje as melhores de sempre." | "as opções de tratamento disponíveis no Brasil se ampliaram." |
| D13 [C] | "A consulta anual estruturada para diabetes é uma das intervenções com melhor relação custo-benefício em toda a medicina." | Delete (no source) |
| D14 [C] | Renato checklist | IDF 16.6M / 6th / +5.7%; Vigitel 5.5%→12.9% (2024 vs "Vigitel 2025" label), +135%; obesity +118%; "111 mil mortes", "20× dengue", ">10 mil amputações / 28 por dia"; 600k T1; 18% GDM; Viva Mais Brasil R$1.5bn; PCDT dates; 20M glargine; ANAD 240k; PCDT GLP-1/SGLT2 in HF/CKD vs SUS coverage; oral GLP-1 / tirzepatide availability; SGLT2 "primeira linha … independentemente da HbA1c"; DiRECT "cerca de 50%"; teplizumab "cerca de dois anos"; zimislecel details; retinopathy programme / CONITEC; "excesso de peso durante a gravidez" screening criterion; flu vaccine; HbA1c 3–6 months; PT/EN symptom-sentence drift |

Also: the 3 diabetes articles contain 4 broken `/br/*` links (handoff R6).

## E. Medical review policy page

Claims not true today: "signed off by a named physician registered with Conselho
Federal de Medicina" (lab/certificate reviewers are Irish/Czech; registration is
regional CRM); "one editorial byline" vs body "Escrito pelo…"; "re-reviewed at
least once a year" / "every report is checked by a member of our clinical team"
(one clinician); "figures … never hard-coded" (diabetes, attendance hard-code
figures); SP CRM shown next to a PA specialty; PT copy is PT-PT ("revemos",
"registado", "equipa", "até si", "junto da Conselho Federal de Medicina").
Proposed EN intro: "Every clinical article we publish for Brazil is drafted from
primary sources and reviewed by a named physician with active registration at a
Regional Council of Medicine (CRM) before publication or update." Report handling:
"Every report is read, and clinical corrections are checked by the reviewing
physician." Needs pt-BR/es drafts and a Brazil code branch.

## Owner / Renato confirmations

1. Signing and delivery workflow (ICP-Brasil? Atesta? PDF by email?) — A1–A3, B1–B11, C6–C8, C17.
2. Results follow-up bookable as a separate consultation? (B8)
3. `globalhealth@myglobalhealth.online` real inbox? (D6; org contact is `info@`)
4. Renato formally "Diretor Clínico"? (D2/D3)
5. Tiago: correct registration, keep credited at all?
6. Were stored review dates real reviews (2026-09-07, 2026-07-21)?
7. Update stored CS/DE/RO translations too?
8. Legal check for A6 citations.
9. Native pt-BR/Brazil-Spanish review of ES copy ("baja", "volante", "despido procedente" are Spain terms).
10. Renato: consent to be named reviewer (and author, if chosen) on all 4 articles
    in 3 locales; reviewed exact final text; review date; registration to display
    (suggest CRM-PA 11426 + RQE 8822); did he write lab/certificate; D14 sign-off.

Attribution recommendation: `reviewerDoctorId = cmqyzr0fb000o01lu9deh6mf5` on all
4 base rows; `lastReviewedAt` set explicitly to Renato's sign-off date via runner;
`authorDoctorId` = Renato only with his consent, otherwise the article stays held
(editorial plan §6).

Size: ~150 exact replacements across 12 BlogPost/BlogTranslation records, 4
attribution updates, 1 code change (policy page).
