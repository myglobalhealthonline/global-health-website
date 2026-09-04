/**
 * Portugal /portugal/pt/doctors profile content — per "Dr portugal seo.docx"
 * (July 2026). One entry per doctor currently live on the Portugal roster.
 *
 * `isMarketOnly: true` marks a doctor whose PRIMARY country is NOT Portugal
 * (Dr. Tiago Figueira — primary Ireland). For those, the patcher only writes
 * the `pt` DoctorCountry's DoctorMarketTranslation row (title/bio/seoTitle/
 * seoDescription) — never the base Doctor row or the shared DoctorTranslation,
 * since that would also change how the doctor's IRELAND profile renders.
 * DoctorMarketTranslation has no `qualifications` column, so `qualifications`
 * is omitted for market-only entries (base fields stay whatever the doctor's
 * primary-market brief already set).
 */

export type FaqEntry = { question: string; answer: string };

export type PortugalDoctorSheet = {
  dbSlug: string;
  /** Set only when the current base fullName is wrong (gender prefix / accent). */
  fullNameFix?: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  /** Patient-facing bio, HTML. */
  bio: string;
  qualifications?: string[];
  /** Language(s) to append to the base Doctor.languages array if missing. */
  languagesAdd?: string[];
  /** Set only when the current medicalRegistrationUrl points at the wrong registry. */
  medicalRegistrationUrlFix?: string;
  isMarketOnly?: boolean;
  faqs: FaqEntry[];
};

export const PORTUGAL_DOCTORS: PortugalDoctorSheet[] = [
  // ── 1. Dr. Tiago Figueira (primary country: Ireland — market-only) ───────
  {
    dbSlug: "dr-tiago-miguel-figueira",
    isMarketOnly: true,
    title: "Médico de Clínica Geral",
    seoTitle: "Dr. Tiago Figueira — Médico de Clínica Geral | OM 77986 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Tiago Figueira — médico registado na Ordem dos Médicos (OM 77986). MUDr. Universidade de Masaryk · Cirurgia Geral Irlanda · Diretor Clínico Global Health · Consulta no mesmo dia.",
    languagesAdd: ["Czech"],
    bio: `
<p>Cirurgia geral de urgência ensina a distinguir depressa o que pode esperar do que não pode — foi essa a base que o Dr. Tiago Miguel Figueira levou consigo da sala de emergências para a consulta online. Formou-se em Medicina Geral pela Universidade de Masaryk, Faculdade de Medicina de Brno, e exerceu como Senior House Officer em Cirurgia Geral no Tipperary University Hospital, na Irlanda, onde lidou com cuidados agudos, medicina perioperatória, assistência cirúrgica e resposta a emergências.</p>
<p>É hoje Diretor Clínico da Global Health na Irlanda e em Portugal, com prática clínica nos dois mercados — e experiência adicional adquirida na República Checa. A função de direção clínica não o afastou da consulta: continua a atender diretamente, com agenda aberta a marcações no mesmo dia.</p>
<p>Em Portugal, as suas consultas de clínica geral cobrem doença aguda, renovação de receitas, atestados médicos e declarações, com disponibilidade em todo o território nacional. As receitas que emite são válidas em qualquer farmácia portuguesa.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infeções respiratórias, febre, gripe, dor de garganta, infeções do ouvido</li>
<li>Infeções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, problemas da tiróide, colesterol elevado</li>
<li>Problemas dermatológicos — eczema, acne, erupções cutâneas, reações alérgicas</li>
<li>Saúde da mulher e do homem — contraceção, preocupações hormonais, saúde masculina</li>
<li>Cuidados preventivos — avaliações de saúde, aconselhamento sobre estilo de vida, rastreios</li>
<li>Medicina de viagem — consultas pré-viagem, aconselhamento vacinal, prescrições para viagem</li>
<li>Gestão do peso — abordagem médica baseada em evidências, incluindo avaliação de GLP-1</li>
<li>Saúde mental — ansiedade, depressão, gestão do stress e referenciação a especialistas</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
</ul>
<p><strong>Em consulta:</strong> ouve antes de decidir, explica o raciocínio clínico em termos claros e fecha cada consulta com um plano de ação definido — não apenas uma receita. O padrão é o mesmo que aplicaria numa urgência hospitalar: avaliação estruturada, decisão fundamentada.</p>
`.trim(),
    faqs: [
      {
        question: "O Dr. Tiago Figueira está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. Tiago Miguel Figueira está registado na Ordem dos Médicos (OM) com o número 77986. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Figueira é formado em Medicina pela Universidade de Masaryk, Brno, e está também registado no Irish Medical Council (IMC 523449) na Irlanda, onde exerceu funções de Senior House Officer em Cirurgia Geral no Tipperary University Hospital.",
      },
      {
        question: "O que trata o Dr. Tiago Figueira em consulta online?",
        answer:
          "O Dr. Figueira oferece consultas de clínica geral online para: doença aguda (infeções respiratórias, febre, gripe, dor de garganta, infeções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol elevado), problemas dermatológicos, saúde da mulher e do homem (contraceção, preocupações hormonais), cuidados preventivos, medicina de viagem, gestão do peso (incluindo avaliação de GLP-1), saúde mental (ansiedade, depressão, stress) e atestados médicos, declarações e renovação de receitas.",
      },
      {
        question: "As receitas emitidas em consulta online são válidas em farmácias portuguesas?",
        answer:
          "Sim. As receitas emitidas pelo Dr. Figueira em consulta de telemedicina são legalmente válidas em qualquer farmácia em Portugal. O Dr. Figueira está registado na Ordem dos Médicos (OM 77986) e as suas prescrições cumprem os requisitos legais para receita eletrónica em Portugal. A receita é enviada por e-mail após a consulta.",
      },
      {
        question: "O Dr. Figueira tem experiência em medicina de emergência e cirurgia?",
        answer:
          "Sim. O Dr. Figueira exerceu funções de Senior House Officer em Cirurgia Geral no Tipperary University Hospital, na Irlanda, com experiência em cuidados agudos, medicina perioperatória, assistência cirúrgica e resposta a emergências. Esta formação hospitalar em ambiente cirúrgico de alta exigência confere-lhe a capacidade de avaliar rapidamente a gravidade de um sintoma — distinguindo o que pode ser tratado online do que requer atenção presencial imediata.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Figueira?",
        answer:
          "Selecione um horário disponível nesta página para agendar diretamente com o Dr. Figueira. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês, espanhol, francês ou checo. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações do Dr. Figueira?",
        answer:
          "O Dr. Tiago Miguel Figueira é médico (MUDr.) pela Universidade de Masaryk, Faculdade de Medicina de Brno. Exerceu funções de Senior House Officer em Cirurgia Geral no Tipperary University Hospital, Irlanda. É Diretor Clínico da Global Health Irlanda e Portugal, registado na Ordem dos Médicos (OM 77986) e no Irish Medical Council (IMC 523449). Detém certificação em Suporte Básico e Avançado de Vida (BLS e ALS) pelo European Resuscitation Council. Consulta em português, inglês, espanhol, francês e checo.",
      },
    ],
  },

  // ── 2. Beatriz Carvalho (Psicóloga Clínica, OPP) ─────────────────────────
  {
    dbSlug: "beatriz-carvalho",
    title: "Psicóloga Clínica",
    seoTitle: "Beatriz Carvalho — Psicóloga Clínica | OPP 31618 | Global Health Portugal",
    seoDescription:
      "Agende uma sessão com Beatriz Carvalho — Psicóloga Clínica registada na OPP (nº 31618). TCC · Intervenção em crise · Neuropsicologia · Reprodução medicamente assistida · Português e inglês. Consulta no mesmo dia.",
    medicalRegistrationUrlFix: "https://www.ordemdospsicologos.pt",
    bio: `
<p>Beatriz Carvalho é Psicóloga Clínica com formação sólida em Psicologia Clínica e da Saúde, especializada na promoção do bem-estar emocional e no desenvolvimento de estratégias de resiliência — uma profissional que combina rigor clínico com uma abordagem genuinamente centrada na pessoa.</p>
<p>A sua prática clínica desenvolveu-se em ambiente hospitalar, onde adquiriu experiência em áreas de elevada exigência emocional: intervenção em crise, neuropsicologia e apoio psicológico em contextos de reprodução medicamente assistida (RMA). Esta última é uma área particularmente sensível — onde os pacientes atravessam processos de grande intensidade emocional — e que requer competências específicas de escuta, contenção e acompanhamento que vão além da psicologia clínica convencional.</p>
<p>A sua formação complementar abrange a prevenção do suicídio, perturbações de personalidade e comunicação difícil em contextos de cuidados paliativos — três domínios que exigem formação especializada e que reflectem um compromisso com as situações clinicamente mais complexas e humanamente mais exigentes.</p>
<p>Actualmente, Beatriz está a aprofundar a sua formação através de uma Especialização Avançada em Terapia Cognitivo-Comportamental (TCC) — uma das abordagens psicológicas com maior suporte empírico para o tratamento de ansiedade, depressão, perturbações de personalidade e outras condições.</p>
<p>A psicologia clínica de qualidade começa pela escuta. Beatriz é reconhecida pela escuta activa e pela capacidade de construir uma relação terapêutica onde cada paciente se sente compreendido — o que torna possível o trabalho clínico real, independentemente da complexidade da situação.</p>
<p><strong>Com o que ajuda:</strong></p>
<ul>
<li>Ansiedade — ansiedade generalizada, ansiedade social, ataques de pânico, preocupação crónica</li>
<li>Depressão e humor baixo — tristeza persistente, perda de motivação, anedonia</li>
<li>Stress e burnout — stress profissional, esgotamento emocional, dificuldade em desligar</li>
<li>Intervenção em crise — apoio em situações de ruptura emocional aguda</li>
<li>Prevenção do suicídio e gestão do risco — avaliação e acompanhamento em situações de risco</li>
<li>Perturbações de personalidade — avaliação e intervenção especializada</li>
<li>Neuropsicologia — avaliação neuropsicológica e acompanhamento de perturbações cognitivas</li>
<li>Apoio psicológico em RMA — suporte emocional durante processos de reprodução medicamente assistida</li>
<li>Cuidados paliativos — apoio psicológico em situações de doença grave e fim de vida</li>
<li>Avaliações de aptidão psicológica</li>
<li>Apoio a crianças, adolescentes e adultos</li>
<li>Desenvolvimento pessoal — autoconhecimento, padrões que se repetem, tomada de decisões</li>
</ul>
<p><strong>A sua abordagem:</strong> Beatriz trabalha com escuta activa e intervenção personalizada — cada sessão é adaptada à pessoa, não a um protocolo genérico. A sua formação em TCC permite-lhe trabalhar de forma estruturada e orientada para resultados, enquanto a sua experiência em ambientes hospitalares de elevada exigência confere-lhe a solidez clínica necessária para acompanhar situações de maior complexidade.</p>
<p><strong>Nota importante:</strong> Se está a experienciar uma crise psicológica ou pensamentos de autolesão, contacte a Linha de Apoio à Crise do SNS24 através do 1024 ou ligue ao 112 — não espere por uma consulta.</p>
`.trim(),
    qualifications: [
      "Psicóloga Clínica — registada na Ordem dos Psicólogos Portugueses (OPP nº 31618)",
      "Especialização Avançada em Terapia Cognitivo-Comportamental (em curso)",
      "Formação em Prevenção do Suicídio",
      "Formação em Perturbações de Personalidade",
      "Formação em Comunicação em Cuidados Paliativos",
      "Experiência hospitalar em intervenção em crise, neuropsicologia e RMA",
      "Avaliações de aptidão psicológica",
    ],
    faqs: [
      {
        question: "A Beatriz Carvalho está registada na Ordem dos Psicólogos Portugueses?",
        answer:
          "Sim. Beatriz Carvalho exerce como Psicóloga Clínica registada na Ordem dos Psicólogos Portugueses (OPP) com o número 31618. Pode verificar este registo em ordemdospsicologos.pt. Beatriz tem experiência clínica hospitalar em intervenção em crise, neuropsicologia e apoio psicológico em reprodução medicamente assistida, e está actualmente a aprofundar a sua formação em Terapia Cognitivo-Comportamental.",
      },
      {
        question: "Com o que pode ajudar a Beatriz em sessão online?",
        answer:
          "A Beatriz oferece apoio psicológico online para: ansiedade (generalizada, social, ataques de pânico), depressão e humor baixo, stress e burnout, intervenção em crise, prevenção do suicídio e gestão do risco, perturbações de personalidade, neuropsicologia, apoio psicológico em reprodução medicamente assistida (RMA), cuidados paliativos, avaliações de aptidão psicológica e apoio a crianças, adolescentes e adultos.",
      },
      {
        question: "O que é o apoio psicológico em RMA e quando é recomendado?",
        answer:
          "A reprodução medicamente assistida (RMA) — que inclui fertilização in vitro, inseminação artificial e outros processos — é uma experiência de grande intensidade emocional para os casais e indivíduos envolvidos. O processo pode envolver incerteza, espera, luto em caso de insucesso, decisões difíceis e impacto significativo na relação e na saúde mental. A Beatriz tem experiência específica em apoio psicológico neste contexto, adquirida em ambiente hospitalar, e pode acompanhar online pacientes que estejam a atravessar um processo de RMA — em qualquer fase do mesmo.",
      },
      {
        question: "O que é a Terapia Cognitivo-Comportamental (TCC) e como funciona em sessão online?",
        answer:
          "A Terapia Cognitivo-Comportamental (TCC) é uma das abordagens psicológicas com maior suporte empírico — eficaz no tratamento de ansiedade, depressão, perturbações de personalidade, burnout e muitas outras condições. A TCC trabalha a relação entre pensamentos, emoções e comportamentos, identificando padrões disfuncionais e desenvolvendo estratégias práticas e duradouras para os modificar. Em sessão online, a TCC funciona com a mesma eficácia que em presença física — o formato de videochamada não compromete a relação terapêutica nem os resultados clínicos.",
      },
      {
        question: "Como agendar uma sessão com a Beatriz?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com a Beatriz. O pagamento é processado de forma segura no momento do agendamento — a sessão é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As sessões são realizadas por videochamada segura e confidencial em português ou inglês. Se está a experienciar uma crise psicológica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112 — não espere por uma sessão.",
      },
      {
        question: "Quais são as qualificações da Beatriz Carvalho?",
        answer:
          "Beatriz Carvalho é Psicóloga Clínica registada na Ordem dos Psicólogos Portugueses (OPP nº 31618). Tem experiência clínica hospitalar em intervenção em crise, neuropsicologia e apoio psicológico em reprodução medicamente assistida. A sua formação complementar inclui prevenção do suicídio, perturbações de personalidade e comunicação em cuidados paliativos. Está actualmente a aprofundar a sua formação através de uma Especialização Avançada em Terapia Cognitivo-Comportamental.",
      },
    ],
  },

  // ── 3. Dra. Ana Varges Gomes (Oncologista Clínica) ───────────────────────
  {
    dbSlug: "dra-ana-varges-gomes",
    title: "Oncologista Clínica",
    seoTitle: "Dra. Ana Varges Gomes — Oncologista Clínica | OM 44172 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dra. Ana Varges Gomes — oncologista clínica registada na OM (nº 44172). CHUA Algarve · EORTC · EHNS · Cancro da cabeça e pescoço, pulmão · Segunda opinião oncológica. Consulta no mesmo dia.",
    bio: `
<p>A Dra. Ana Varges Gomes é oncologista clínica com uma carreira de décadas dedicada ao tratamento, à investigação e ao desenvolvimento da oncologia em Portugal e na Europa — uma das especialistas em oncologia com maior projecção académica e institucional disponíveis para consulta online no país.</p>
<p>Actualmente exerce como oncologista clínica no Centro Hospitalar Universitário do Algarve (CHUA), onde foi coordenadora do Registo Regional de Cancro e participa activamente em equipas multidisciplinares para o cancro do pulmão e outros grupos de tumores. A sua carreira inclui cargos de liderança de alto nível: Directora do Departamento de Oncologia Médica, Directora Clínica do Centro Médico e de Pesquisa Lenitudes e Presidente do Conselho de Administração do Centro Hospitalar Universitário do Algarve — uma trajetória que reflecte não apenas competência clínica, mas também capacidade de liderança e gestão em ambientes de saúde de elevada complexidade.</p>
<p>No plano europeu, a Dra. Ana Varges Gomes é reconhecida como líder e membro do conselho de organizações de oncologia de referência internacional, incluindo a Organização Europeia para Investigação e Tratamento do Cancro (EORTC) e a Sociedade Europeia de Cabeça e Pescoço (EHNS). É autora e co-autora de inúmeras publicações científicas e orientações clínicas — nomeadamente nas áreas de cancro da cabeça e pescoço e cancro do pulmão — e actuou como investigadora principal em ensaios clínicos multinacionais.</p>
<p>As suas áreas de especialização clínica abrangem tumores da cabeça e pescoço, cancro do pulmão, oncologia urológica, tumores hepatobiliares e cancro da pele, com coordenação de residentes de oncologia, equipas multidisciplinares e unidades de investigação clínica. Dedica-se ainda ao ensino médico, orientando estudantes de medicina e residentes de oncologia, e contribuindo para campanhas internacionais de consciencialização sobre prevenção e tratamento do cancro.</p>
<p>Para um doente com diagnóstico de cancro — ou a acompanhar um familiar com cancro — ter acesso a uma opinião de uma oncologista com este percurso académico, clínico e de liderança, de forma directa e sem lista de espera, pode fazer uma diferença real na qualidade das decisões que têm de ser tomadas.</p>
<p><strong>O que oferece online:</strong></p>
<ul>
<li>Segunda opinião oncológica — revisão de diagnósticos, resultados de biopsias, relatórios de imagem e planos de tratamento</li>
<li>Cancro da cabeça e pescoço — avaliação, interpretação de resultados e orientação terapêutica</li>
<li>Cancro do pulmão — avaliação, interpretação de resultados, estadiamento e opções de tratamento</li>
<li>Oncologia urológica — avaliação de tumores renais, da bexiga e da próstata</li>
<li>Tumores hepatobiliares — cancro do fígado, das vias biliares e do pâncreas</li>
<li>Cancro da pele — melanoma e outros tumores cutâneos</li>
<li>Orientação sobre ensaios clínicos — informação sobre ensaios disponíveis e elegibilidade</li>
<li>Interpretação de resultados oncológicos — PET-CT, biopsias, marcadores tumorais, testes moleculares</li>
<li>Acompanhamento pós-tratamento — vigilância oncológica e gestão de efeitos secundários a longo prazo</li>
<li>Apoio ao doente e família — orientação em momentos de decisão clínica complexa</li>
<li>Cuidados paliativos oncológicos — orientação sobre controlo de sintomas e qualidade de vida em doença avançada</li>
</ul>
<p><strong>Nota importante:</strong> A Dra. Ana Varges Gomes não administra quimioterapia, radioterapia nem realiza procedimentos invasivos através de videochamada. A consulta online oferece avaliação clínica especializada, segunda opinião e orientação — com especial valor para doentes que precisam de clareza antes de tomar uma decisão, ou que querem uma perspectiva especializada adicional sobre o seu caso. Se está a viver uma emergência oncológica, dirija-se ao serviço de urgência mais próximo ou contacte o 112.</p>
<p><strong>A sua abordagem:</strong> A Dra. Ana Varges Gomes é reconhecida por uma prática compassiva e holística — centrada não apenas no tumor, mas na pessoa que está a enfrentar um diagnóstico de cancro. A sua experiência em equipas multidisciplinares e investigação clínica traduz-se numa capacidade de oferecer ao doente uma perspectiva integrada: o que diz a evidência científica mais recente, o que são as opções disponíveis e o que pode esperar de cada uma. Essa clareza, em oncologia, é um cuidado em si mesmo.</p>
`.trim(),
    qualifications: [
      "Oncologista Clínica — Colégio de Especialidade em Oncologia Médica, Ordem dos Médicos (OM 44172)",
      "Oncologista Clínica — Centro Hospitalar Universitário do Algarve (CHUA)",
      "Coordenadora do Registo Regional de Cancro — CHUA",
      "Directora do Departamento de Oncologia Médica",
      "Directora Clínica — Centro Médico e de Pesquisa Lenitudes",
      "Presidente do Conselho de Administração — Centro Hospitalar Universitário do Algarve",
      "Membro do conselho — EORTC (Organização Europeia para Investigação e Tratamento do Cancro)",
      "Membro do conselho — EHNS (Sociedade Europeia de Cabeça e Pescoço)",
      "Investigadora principal — ensaios clínicos multinacionais",
      "Autora e co-autora de publicações científicas e orientações clínicas em oncologia",
      "Docente e orientadora de residentes de oncologia",
    ],
    faqs: [
      {
        question: "A Dra. Ana Varges Gomes está registada na Ordem dos Médicos com especialidade em Oncologia?",
        answer:
          "Sim. A Dra. Ana Varges Gomes está registada na Ordem dos Médicos (OM) com o número 44172 e detém título de especialista pelo Colégio de Especialidade em Oncologia Médica. Pode verificar este registo em ordemdosmedicos.pt. A Dra. Ana Varges Gomes exerce actualmente no Centro Hospitalar Universitário do Algarve e é membro do conselho da EORTC e da EHNS.",
      },
      {
        question: "O que oferece a Dra. Varges Gomes em consulta online?",
        answer:
          "A Dra. Ana Varges Gomes oferece consultas oncológicas online para: segunda opinião sobre diagnósticos, biópsias, imagem e planos de tratamento; cancro da cabeça e pescoço; cancro do pulmão; oncologia urológica; tumores hepatobiliares; cancro da pele; orientação sobre ensaios clínicos; interpretação de resultados oncológicos (PET-CT, marcadores tumorais, testes moleculares); acompanhamento pós-tratamento e vigilância oncológica; apoio ao doente e família em momentos de decisão complexa; e cuidados paliativos oncológicos. A consulta online não inclui administração de quimioterapia, radioterapia nem procedimentos invasivos.",
      },
      {
        question: "O que é uma segunda opinião oncológica e quando devo pedi-la?",
        answer:
          "Uma segunda opinião oncológica é uma avaliação independente do seu diagnóstico, dos resultados das suas análises e do plano de tratamento proposto, realizada por um especialista em oncologia que não está envolvido no seu tratamento principal. É especialmente recomendada quando o diagnóstico é raro ou complexo, quando existem dúvidas sobre as opções de tratamento disponíveis, quando se considera participar num ensaio clínico, ou simplesmente quando se pretende a tranquilidade de uma perspectiva especializada adicional antes de iniciar um tratamento. A Dra. Ana Varges Gomes é investigadora principal em ensaios clínicos multinacionais e autora de orientações clínicas em oncologia — uma perspectiva com base na evidência mais recente.",
      },
      {
        question: "A Dra. Varges Gomes tem experiência específica em cancro da cabeça e pescoço e cancro do pulmão?",
        answer:
          "Sim. O cancro da cabeça e pescoço e o cancro do pulmão são as áreas de maior especialização da Dra. Ana Varges Gomes — com publicações científicas, orientações clínicas e participação activa em equipas multidisciplinares especializadas no CHUA. É membro do conselho da EHNS (Sociedade Europeia de Cabeça e Pescoço) e da EORTC, onde participou como investigadora principal em ensaios clínicos nessas áreas. Para doentes com este tipo de diagnóstico, a sua consulta online representa acesso directo a uma das perspectivas mais especializadas disponíveis em Portugal.",
      },
      {
        question: "Como agendar uma consulta com a Dra. Varges Gomes?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com a Dra. Ana Varges Gomes. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês, espanhol ou francês. Se tiver relatórios de PET-CT, biopsias, análises ou cartas do oncologista que acompanha, partilhe-os antes da consulta para uma avaliação mais precisa.",
      },
      {
        question: "Quais são as qualificações da Dra. Ana Varges Gomes?",
        answer:
          "A Dra. Ana Varges Gomes é oncologista clínica com título de especialista pelo Colégio de Especialidade em Oncologia Médica da Ordem dos Médicos (OM 44172). Exerce no Centro Hospitalar Universitário do Algarve, onde foi coordenadora do Registo Regional de Cancro. Foi Directora do Departamento de Oncologia Médica, Directora Clínica do Lenitudes e Presidente do Conselho de Administração do CHUA. É membro do conselho da EORTC e da EHNS, investigadora principal em ensaios clínicos multinacionais, autora de publicações e orientações clínicas em oncologia, e docente de residentes de oncologia. Consulta em português, inglês, espanhol e francês.",
      },
    ],
  },

  // ── 4. Dra. Nádia Cavaco (fullName accent fix: "Dra Nadia" → "Dra. Nádia") ──
  {
    dbSlug: "dra-nadia-cavaco",
    fullNameFix: "Dra. Nádia Cavaco",
    title: "Médica de Clínica Geral",
    seoTitle: "Dra. Nádia Cavaco — Médica de Clínica Geral | OM 73521 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dra. Nádia Cavaco — médica de clínica geral registada na OM (nº 73521). Atenção primária · Telemedicina · Medicina Interna, Pediatria, Psiquiatria e Saúde Pública · Consulta no mesmo dia.",
    bio: `
<p>A Dra. Nádia Cavaco é médica de clínica geral com experiência em cuidados de saúde primários e um compromisso genuíno com a modernização do acesso à assistência médica através da telemedicina — uma profissional que combina formação clínica abrangente com uma abordagem centrada na pessoa e nas suas necessidades concretas.</p>
<p>A sua prática clínica abrange o diagnóstico médico e a saúde preventiva, com experiência no manejo de doenças agudas, teleconsultas e acompanhamento clínico domiciliar. A sua formação médica integrou diversas áreas clínicas — Medicina Interna, Pediatria, Psiquiatria e Saúde Pública — o que lhe confere uma visão holística e integrada do doente e do seu contexto de vida.</p>
<p>A Dra. Nádia é reconhecida pela sua comunicação eficaz e pela capacidade de construir relações de confiança com os doentes e as suas famílias. Dedica particular atenção à literacia em saúde — ajudando os doentes a compreender os seus diagnósticos, a interpretar resultados e a tomar decisões informadas sobre a sua saúde. Esta abordagem é especialmente valiosa em consulta online, onde a clareza da comunicação é tão importante quanto o diagnóstico.</p>
<p>A telemedicina não é para a Dra. Nádia uma adaptação — é uma convicção. Acredita que a qualidade dos cuidados primários não deve depender do local onde o doente vive, e que uma boa consulta online pode ser tão eficaz e mais acessível do que uma consulta presencial para a grande maioria das situações de saúde do dia a dia.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, dor de garganta, infecções do ouvido</li>
<li>Infecções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, problemas da tiróide, colesterol elevado</li>
<li>Medicina Interna — avaliação e orientação clínica de condições sistémicas</li>
<li>Saúde pediátrica — avaliação de sintomas em crianças e adolescentes, orientação a pais</li>
<li>Saúde mental — ansiedade, depressão, gestão do stress e referenciação a especialistas</li>
<li>Saúde Pública e preventiva — rastreios, vacinação, avaliações de saúde, aconselhamento</li>
<li>Acompanhamento domiciliar — orientação clínica e monitorização remota para doentes com mobilidade reduzida</li>
<li>Atestados médicos e declarações</li>
<li>Renovação de receitas e revisão de medicação</li>
<li>Referenciação para especialistas e meios complementares de diagnóstico</li>
</ul>
<p><strong>A sua abordagem:</strong> A Dra. Nádia trabalha com uma abordagem humanizada e centrada no doente — cada consulta é orientada para as necessidades específicas da pessoa, não para um protocolo genérico. A sua experiência em equipas multidisciplinares e a atenção particular à comunicação fazem de cada consulta um momento de escuta real e orientação concreta.</p>
`.trim(),
    qualifications: [
      "Médica de Clínica Geral — Divisão Geral, Ordem dos Médicos (OM 73521)",
      "Formação em Diagnóstico Médico e Saúde Preventiva",
      "Experiência clínica em Medicina Interna, Pediatria, Psiquiatria e Saúde Pública",
      "Experiência em telemedicina e acompanhamento clínico domiciliar",
    ],
    faqs: [
      {
        question: "A Dra. Nádia Cavaco está registada na Ordem dos Médicos?",
        answer:
          "Sim. A Dra. Nádia Cavaco está registada na Ordem dos Médicos (OM) com o número 73521, na Divisão Geral. Pode verificar este registo em ordemdosmedicos.pt. A Dra. Nádia tem experiência em cuidados de saúde primários, telemedicina e acompanhamento clínico domiciliar, com formação em Medicina Interna, Pediatria, Psiquiatria e Saúde Pública.",
      },
      {
        question: "O que trata a Dra. Nádia Cavaco em consulta online?",
        answer:
          "A Dra. Nádia oferece consultas de clínica geral online para: doença aguda (infecções respiratórias, febre, gripe, infecções urinárias), doenças crónicas (hipertensão, diabetes, tiróide, colesterol), Medicina Interna, saúde pediátrica (crianças e adolescentes), saúde mental (ansiedade, depressão, stress), saúde preventiva e rastreios, acompanhamento domiciliar, atestados médicos, renovação de receitas e referenciação a especialistas.",
      },
      {
        question: "A Dra. Nádia tem experiência em saúde pediátrica?",
        answer:
          "Sim. A formação clínica da Dra. Nádia inclui Pediatria, o que lhe permite avaliar sintomas em crianças e adolescentes e orientar os pais sobre a gestão de situações de saúde na infância — desde doenças agudas comuns (febre, infecções respiratórias, problemas gastrointestinais) até questões de desenvolvimento e saúde preventiva pediátrica. Para pais que procuram orientação médica fiável sobre a saúde dos seus filhos sem uma deslocação ao centro de saúde, a consulta online com a Dra. Nádia é uma opção acessível e eficaz.",
      },
      {
        question: "O que é o acompanhamento clínico domiciliar em telemedicina?",
        answer:
          "O acompanhamento clínico domiciliar em telemedicina permite monitorizar remotamente doentes com doenças crónicas, mobilidade reduzida ou em fase de recuperação — sem necessidade de deslocação ao centro de saúde. A Dra. Nádia tem experiência específica neste modelo de cuidados, que é especialmente valorizado por doentes idosos, por famílias que cuidam de doentes dependentes e por qualquer pessoa que beneficie de um acompanhamento clínico regular e acessível a partir de casa.",
      },
      {
        question: "Como agendar uma consulta com a Dra. Nádia?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com a Dra. Nádia Cavaco. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações da Dra. Nádia Cavaco?",
        answer:
          "A Dra. Nádia Cavaco está registada na Ordem dos Médicos (OM 73521, Divisão Geral) e tem experiência em cuidados de saúde primários, diagnóstico médico e saúde preventiva. A sua formação clínica abrangeu Medicina Interna, Pediatria, Psiquiatria e Saúde Pública. Tem experiência em telemedicina, teleconsultas e acompanhamento clínico domiciliar, com uma abordagem centrada na comunicação eficaz e na literacia em saúde.",
      },
    ],
  },

  // ── 5. Dra. Ana Leal Neto (fullName prefix fix: "Dr" → "Dra.") ──────────
  {
    dbSlug: "dr-ana-leal-neto",
    fullNameFix: "Dra. Ana Leal Neto",
    title: "Cardiologista",
    seoTitle: "Dra. Ana Leal Neto — Cardiologista | OM 60410 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dra. Ana Leal Neto — cardiologista registada na OM (nº 60410). Faculdade de Medicina UP · ULS Tâmega e Sousa · Insuficiência cardíaca · Young Ambassador HFA/ESC · Português, inglês e francês. Consulta no mesmo dia.",
    bio: `
<p>A Dra. Ana Leal Neto é médica especialista em Cardiologia formada pela Faculdade de Medicina da Universidade do Porto — uma das mais conceituadas escolas médicas em Portugal — com experiência clínica em ambiente hospitalar de cuidados cardíacos agudos e emergência, e em consulta externa especializada.</p>
<p>Exerce actualmente como cardiologista nos Serviços de Cardiologia da Unidade Local de Saúde do Tâmega e Sousa e do Hospital Lusíadas de Paços de Ferreira. As suas principais áreas de interesse clínico são a insuficiência cardíaca, os cuidados cardiovasculares agudos, a reabilitação cardíaca e a prevenção cardiovascular.</p>
<p>A sua formação europeia avançada é um elemento distintivo: realizou estágios especializados em insuficiência cardíaca avançada e cuidados intensivos cardíacos em Lyon, França, e em reabilitação cardíaca e prevenção cardiovascular em Santiago de Compostela, Espanha — dois centros de referência europeia nestas áreas. Possui certificações europeias em Ecocardiografia Transtorácica e Cuidados Cardiovasculares Agudos, e concluiu o Exame Europeu de Cardiologia da Sociedade Europeia de Cardiologia (ESC).</p>
<p>No plano internacional, a Dra. Ana Leal Neto é Young Ambassador da Heart Failure Association da Sociedade Europeia de Cardiologia (2023–2026) — uma distinção atribuída a jovens cardiologistas com especial contributo para a área da insuficiência cardíaca — e actua como co-investigadora em ensaios clínicos internacionais, especialmente na área da insuficiência cardíaca.</p>
<p>Para um doente com doença cardiovascular — ou com factores de risco cardiovascular que quer avaliar com rigor — ter acesso directo a uma cardiologista com formação europeia especializada em insuficiência cardíaca avançada, certificação em ecocardiografia e participação em investigação clínica activa, sem lista de espera, representa um nível de cuidado especializado raramente disponível de forma imediata.</p>
<p><strong>O que oferece online:</strong></p>
<ul>
<li>Avaliação cardiovascular — avaliação de sintomas cardíacos (palpitações, dor torácica, dispneia, edemas), factores de risco e estratificação</li>
<li>Insuficiência cardíaca — avaliação, orientação terapêutica, interpretação de resultados e seguimento</li>
<li>Cuidados cardiovasculares agudos — avaliação de episódios agudos cardiovasculares e orientação sobre próximos passos</li>
<li>Reabilitação cardíaca — orientação sobre programas de reabilitação, progressão de actividade física e seguimento pós-evento</li>
<li>Prevenção cardiovascular — avaliação de risco cardiovascular, aconselhamento sobre estilo de vida, cribagem e estratificação de risco</li>
<li>Interpretação de resultados de ecocardiografia — com certificação europeia em Ecocardiografia Transtorácica</li>
<li>Interpretação de ECG, Holter e outros exames cardiovasculares</li>
<li>Segunda opinião cardiológica — sobre diagnósticos, resultados de exames ou planos de tratamento</li>
<li>Orientação sobre ensaios clínicos em insuficiência cardíaca — informação sobre elegibilidade e disponibilidade</li>
<li>Consultas pré e pós-procedimento — preparação e seguimento de procedimentos cardíacos</li>
<li>Hipertensão e dislipidemia — avaliação e gestão no contexto de risco cardiovascular</li>
<li>Relatórios médicos e referenciação a especialistas</li>
</ul>
<p><strong>Nota importante:</strong> A Dra. Ana Leal Neto não realiza cateterismos, intervenções coronárias, implantação de pacemakers nem procedimentos invasivos através de videochamada. Se está a viver uma emergência cardíaca — dor torácica aguda, dificuldade grave em respirar, perda de consciência ou arritmia severa — ligue imediatamente ao 112.</p>
<p><strong>A sua abordagem:</strong> A Dra. Ana Leal Neto pratica uma cardiologia personalizada, baseada na melhor evidência científica e centrada nas necessidades de cada doente. A sua experiência em ensaios clínicos e investigação activa em insuficiência cardíaca traduz-se numa consulta onde o doente tem acesso não apenas à prática clínica estabelecida, mas à fronteira do conhecimento cardiovascular actual.</p>
`.trim(),
    qualifications: [
      "Especialista em Cardiologia — Ordem dos Médicos (OM 60410) · Sociedade Portuguesa de Cardiologia",
      "Licenciada em Medicina — Faculdade de Medicina, Universidade do Porto",
      "Cardiologista — ULS Tâmega e Sousa",
      "Cardiologista — Hospital Lusíadas, Paços de Ferreira",
      "Estágio avançado em Insuficiência Cardíaca Avançada e Cuidados Intensivos Cardíacos — Lyon, França",
      "Estágio avançado em Reabilitação Cardíaca e Prevenção Cardiovascular — Santiago de Compostela, Espanha",
      "Certificação Europeia em Ecocardiografia Transtorácica — ESC",
      "Certificação Europeia em Cuidados Cardiovasculares Agudos — ESC",
      "Exame Europeu de Cardiologia — ESC",
      "Young Ambassador, Heart Failure Association, ESC (2023–2026)",
      "Co-investigadora em ensaios clínicos internacionais em insuficiência cardíaca",
    ],
    faqs: [
      {
        question: "A Dra. Ana Leal Neto está registada na Ordem dos Médicos com especialidade em Cardiologia?",
        answer:
          "Sim. A Dra. Ana Leal Neto está registada na Ordem dos Médicos (OM) com o número 60410 e é membro da Sociedade Portuguesa de Cardiologia. Pode verificar este registo em ordemdosmedicos.pt. A Dra. Ana Leal Neto exerce actualmente como cardiologista na ULS Tâmega e Sousa e no Hospital Lusíadas de Paços de Ferreira, e é Young Ambassador da Heart Failure Association da Sociedade Europeia de Cardiologia (2023–2026).",
      },
      {
        question: "O que oferece a Dra. Ana Leal Neto em consulta online?",
        answer:
          "A Dra. Ana Leal Neto oferece consultas cardiológicas online para: avaliação cardiovascular (sintomas, factores de risco, estratificação), insuficiência cardíaca (avaliação, orientação e seguimento), cuidados cardiovasculares agudos, reabilitação cardíaca, prevenção cardiovascular, interpretação de ecocardiogramas e ECG, segunda opinião cardiológica, orientação sobre ensaios clínicos em insuficiência cardíaca, consultas pré e pós-procedimento, hipertensão e dislipidemia. A consulta online não inclui procedimentos invasivos.",
      },
      {
        question: "O que é a Young Ambassador da Heart Failure Association da ESC e por que é relevante?",
        answer:
          "O programa Young Ambassadors da Heart Failure Association (HFA) da Sociedade Europeia de Cardiologia (ESC) é uma distinção atribuída a jovens cardiologistas com especial contributo e interesse na área da insuficiência cardíaca, com o objectivo de promover a colaboração e a partilha de conhecimento a nível internacional. A Dra. Ana Leal Neto integra este programa para o período 2023–2026, o que a posiciona na vanguarda da cardiologia europeia em insuficiência cardíaca — uma área em rápida evolução com novas terapêuticas e protocolos a emergirem continuamente. Para doentes com insuficiência cardíaca, isto significa acesso a uma perspectiva actualizada sobre o melhor tratamento disponível.",
      },
      {
        question: "A Dra. Leal Neto pode interpretar o meu ecocardiograma em consulta online?",
        answer:
          "Sim. A Dra. Ana Leal Neto possui certificação europeia em Ecocardiografia Transtorácica pela Sociedade Europeia de Cardiologia e pode interpretar e explicar relatórios de ecocardiografia transtorácica e transesofágica como parte da consulta online. Se partilhar o relatório do ecocardiograma antes da consulta, a Dra. Leal Neto poderá oferecer uma avaliação mais detalhada e contextualizada — incluindo o que os resultados significam clinicamente e quais são os próximos passos recomendados.",
      },
      {
        question: "Como agendar uma consulta com a Dra. Ana Leal Neto?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com a Dra. Ana Leal Neto. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês ou francês. Se tiver relatórios de ecocardiograma, ECG, Holter ou análises cardiovasculares, partilhe-os antes da consulta para uma avaliação mais precisa. Se está a experienciar uma emergência cardíaca, ligue ao 112 imediatamente.",
      },
      {
        question: "Quais são as qualificações da Dra. Ana Leal Neto?",
        answer:
          "A Dra. Ana Leal Neto é licenciada em Medicina pela Faculdade de Medicina da Universidade do Porto e especialista em Cardiologia, registada na OM (nº 60410) e na Sociedade Portuguesa de Cardiologia. Exerce na ULS Tâmega e Sousa e no Hospital Lusíadas de Paços de Ferreira. Realizou estágios avançados em Lyon (insuficiência cardíaca avançada e cuidados intensivos cardíacos) e Santiago de Compostela (reabilitação cardíaca). Possui certificações europeias em Ecocardiografia Transtorácica e Cuidados Cardiovasculares Agudos da ESC, e concluiu o Exame Europeu de Cardiologia. É Young Ambassador da Heart Failure Association da ESC (2023–2026) e co-investigadora em ensaios clínicos internacionais em insuficiência cardíaca.",
      },
    ],
  },

  // ── 6. Dr. Egas Moura (Pediatra) ──────────────────────────────────────────
  {
    dbSlug: "dr-egas-moura",
    title: "Pediatra",
    seoTitle: "Dr. Egas Moura — Pediatra | OM 34823 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Egas Moura — pediatra registado na OM (nº 34823). 20+ anos experiência · ICBAS Porto · RCPCH · AAP · Neonatologia · Emergência Pediátrica · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Egas Moura é médico especialista em Pediatria com mais de vinte anos de experiência clínica em Pediatria Geral, Medicina de Emergência Pediátrica e Neonatologia — um dos pediatras com maior profundidade de experiência clínica e internacional disponíveis para consulta online em Portugal.</p>
<p>Formou-se em Medicina pelo ICBAS — Instituto de Ciências Biomédicas Abel Salazar, Universidade do Porto — e concluiu a sua especialização em Pediatria no Hospital Geral de Santo António, no Porto. Ao longo da sua carreira, ocupou cargos de elevada responsabilidade, incluindo Chefe do Departamento de Pediatria e Director Clínico, liderando equipas médicas e participando activamente na implementação de padrões clínicos, protocolos de atendimento e programas de melhoria contínua da qualidade.</p>
<p>Actualmente exerce como Consultor Sénior de Pediatria no Bahrain, onde liderou o Departamento de Pediatria de um hospital acreditado com o Selo de Qualidade Diamante — a mais elevada distinção de qualidade clínica no sistema de saúde do Bahrain — o que reflecte o seu comprometimento com a excelência clínica, a segurança do doente e as melhores práticas médicas em contextos de elevada exigência.</p>
<p>O Dr. Egas Moura tem vasta experiência no cuidado de crianças desde o período neonatal até à adolescência: acompanhamento do crescimento e desenvolvimento, prevenção de doenças, vacinação, manejo de condições agudas e crónicas, e situações de emergência. É certificado em Suporte Básico e Avançado de Vida Pediátrico (PALS/APLS) e Reanimação Neonatal, com prática consolidada em ambientes de alta complexidade clínica.</p>
<p>É membro de organizações pediátricas internacionais de referência: o Royal College of Paediatrics and Child Health (RCPCH) e a American Academy of Pediatrics (AAP) — distinções que reflectem o reconhecimento da sua prática ao mais alto nível clínico internacional.</p>
<p>Para além da prática clínica, o Dr. Egas Moura tem experiência consolidada em ensino médico, tendo dirigido programas de residência médica e participado na formação de médicos e profissionais de saúde em Portugal e em projectos internacionais, nomeadamente na Guiné-Bissau.</p>
<p>Para pais com filhos com problemas de saúde complexos, dúvidas sobre desenvolvimento, ou que procuram uma segunda opinião pediátrica especializada — ou simplesmente uma orientação fiável sobre uma situação que os preocupa sem quererem esperar pela próxima consulta — o Dr. Egas Moura representa uma referência pediátrica raramente acessível de forma directa e imediata.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Pediatria geral — avaliação de sintomas em recém-nascidos, lactentes, crianças e adolescentes</li>
<li>Doenças agudas — febre, infecções respiratórias, gastrointestinais, otites, dermatologias comuns</li>
<li>Neonatologia — avaliação e orientação sobre recém-nascidos e primeiros meses de vida</li>
<li>Emergência pediátrica — avaliação de sintomas que geram dúvida sobre urgência</li>
<li>Crescimento e desenvolvimento — acompanhamento, avaliação de curvas e marcos de desenvolvimento</li>
<li>Vacinação — orientação sobre plano de vacinação, vacinação de viagem e gestão de efeitos adversos</li>
<li>Doenças crónicas pediátricas — asma, alergias, diabetes, epilepsia, seguimento e orientação</li>
<li>Saúde do adolescente — saúde mental, nutrição, acne, saúde sexual, desenvolvimento</li>
<li>Segunda opinião pediátrica — sobre diagnósticos, planos de tratamento ou resultados de exames</li>
<li>Apoio a pais — orientação sobre alimentação, sono, comportamento e bem-estar infantil</li>
</ul>
<p><strong>A sua abordagem:</strong> O Dr. Egas Moura é reconhecido pela sua abordagem humanizada, comunicação clara com as famílias e visão global da saúde infantil. Vinte anos de pediatria em contextos muito distintos — de hospitais universitários portugueses a unidades de alta complexidade internacional — conferiram-lhe a capacidade de avaliar qualquer situação pediátrica com rigor, serenidade e clareza. Em consulta online, isso traduz-se numa orientação que os pais podem realmente seguir — não apenas em tranquilidade superficial, mas em planos concretos.</p>
`.trim(),
    qualifications: [
      "Médico Especialista em Pediatria — Colégio de Especialidade em Pediatria, Ordem dos Médicos (OM 34823)",
      "Licenciado em Medicina — ICBAS, Instituto de Ciências Biomédicas Abel Salazar, Universidade do Porto",
      "Especialização em Pediatria — Hospital Geral de Santo António, Porto",
      "Consultor Sénior de Pediatria — Bahrain (hospital com Diamond Quality Seal)",
      "Chefe do Departamento de Pediatria e Director Clínico (cargos anteriores)",
      "Certificado em PALS/APLS — Suporte Avançado de Vida Pediátrico",
      "Certificado em Reanimação Neonatal",
      "Membro — Royal College of Paediatrics and Child Health (RCPCH)",
      "Membro — American Academy of Pediatrics (AAP)",
      "Experiência em ensino médico e programas de residência em Portugal e Guiné-Bissau",
    ],
    faqs: [
      {
        question: "O Dr. Egas Moura está registado na Ordem dos Médicos com especialidade em Pediatria?",
        answer:
          "Sim. O Dr. Egas Moura está registado na Ordem dos Médicos (OM) com o número 34823 e detém título de especialista pelo Colégio de Especialidade em Pediatria. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Egas Moura tem mais de vinte anos de experiência em Pediatria Geral, Emergência Pediátrica e Neonatologia, e é membro do Royal College of Paediatrics and Child Health e da American Academy of Pediatrics.",
      },
      {
        question: "O que trata o Dr. Egas Moura em consulta online?",
        answer:
          "O Dr. Egas Moura oferece consultas pediátricas online para: avaliação de sintomas em recém-nascidos, lactentes, crianças e adolescentes; doenças agudas (febre, infecções respiratórias e gastrointestinais, otites); neonatologia (avaliação e orientação sobre recém-nascidos); emergência pediátrica (avaliação de urgência real); crescimento e desenvolvimento; vacinação; doenças crónicas pediátricas (asma, alergias, diabetes, epilepsia); saúde do adolescente; segunda opinião pediátrica; e apoio a pais sobre alimentação, sono e comportamento.",
      },
      {
        question: "O que distingue o Dr. Egas Moura de outros pediatras disponíveis online?",
        answer:
          "Três elementos raramente combinados num único perfil pediátrico online: mais de vinte anos de experiência clínica real em contextos de elevada exigência — de hospitais universitários portugueses a unidades internacionais de alta complexidade; certificações pediátricas internacionais de referência, nomeadamente o RCPCH e a AAP; e experiência em liderança clínica como Chefe de Departamento de Pediatria e Director Clínico — o que lhe confere uma visão sistémica da saúde infantil que vai além da consulta individual. Para pais com situações complexas ou que procuram uma segunda opinião altamente qualificada, este conjunto de experiências é dificilmente igualável.",
      },
      {
        question: "O Dr. Moura tem experiência em neonatologia e no cuidado de recém-nascidos?",
        answer:
          "Sim. A neonatologia é uma das áreas de experiência clínica do Dr. Egas Moura, com prática em ambientes hospitalares de alta complexidade. Para pais de recém-nascidos com dúvidas sobre o desenvolvimento nos primeiros dias e semanas de vida — alimentação, icterícia, curva de peso, comportamento do sono, manchas cutâneas — uma consulta online com o Dr. Moura permite uma avaliação pediátrica especializada sem necessidade de deslocação à urgência pediátrica.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Egas Moura?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Egas Moura. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Para consultas pediátricas, recomendamos que a criança esteja presente durante a consulta sempre que possível.",
      },
      {
        question: "Quais são as qualificações do Dr. Egas Moura?",
        answer:
          "O Dr. Egas Moura é licenciado em Medicina pelo ICBAS, Universidade do Porto, e especialista em Pediatria com formação no Hospital Geral de Santo António, Porto. Tem mais de vinte anos de experiência em Pediatria Geral, Emergência Pediátrica e Neonatologia, tendo ocupado cargos de Chefe do Departamento de Pediatria e Director Clínico. Actualmente exerce como Consultor Sénior de Pediatria no Bahrain (hospital com Diamond Quality Seal). É certificado em PALS/APLS e Reanimação Neonatal, e é membro do Royal College of Paediatrics and Child Health e da American Academy of Pediatrics. Registado na OM (nº 34823, Colégio de Especialidade em Pediatria).",
      },
    ],
  },

  // ── 7. Dra. Joana Branco Maia (Médica e Psicóloga Clínica; fullName gender-prefix fix) ──
  {
    dbSlug: "dr-joana-branco-maia",
    fullNameFix: "Dra. Joana Branco Maia",
    title: "Médica e Psicóloga Clínica",
    seoTitle: "Dra. Joana Branco Maia — Médica e Psicóloga Clínica | OM 64572 · OPP 12055 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dra. Joana Branco Maia — médica (OM 64572) e psicóloga clínica (OPP 12055). PhD Psicologia do Desenvolvimento · Urgência Hospital da Prelada · Saúde mental integrada. Consulta no mesmo dia.",
    bio: `
<p>A Dra. Joana Branco Maia é, em toda a acepção da palavra, única: é simultaneamente médica licenciada e psicóloga clínica habilitada — com prática activa e formação académica avançada em ambas as áreas. Esta dupla habilitação não é apenas curricular. Traduz-se numa forma de consultar diferente: uma profissional que consegue avaliar o doente tanto do ponto de vista físico como psicológico, sem que um aspecto se sobreponha ao outro, e que tem a competência para tratar — não apenas para referenciar.</p>
<p>Como médica, a Dra. Joana Branco Maia tem experiência em medicina de urgência, medicina geral e anestesiologia. Exerce actualmente como médica de urgência no Hospital da Prelada, no Porto — ambiente de alta exigência clínica que exige precisão diagnóstica e decisão rápida. A sua base em anestesiologia conferiu-lhe competências avançadas em cuidados perioperatórios e cuidados agudos. Tem também experiência no acompanhamento de doentes em hemodiálise e em medicina móvel — assistência domiciliar e hoteleira a viajantes internacionais e doentes locais — e em telemedicina.</p>
<p>Como psicóloga clínica, a Dra. Joana Branco Maia está registada na Ordem dos Psicólogos Portugueses (OPP 12055), é doutorada em Psicologia do Desenvolvimento e tem especialização em Psicologia Clínica e da Saúde — uma formação de investigadora que complementa e aprofunda a sua prática clínica. As suas áreas de intervenção psicológica incluem o stress, a ansiedade, a depressão e a insónia, com competência específica em psicologia da saúde aplicada à gestão do peso e ao tratamento psicológico da dor crónica. Tem formação avançada em saúde mental do bebé e intervenção precoce, incluindo DIR®/Floortime e o modelo Circle of Security.</p>
<p>Na prática, o que a Dra. Joana oferece é algo que raramente existe: um único profissional que pode acompanhar a mesma pessoa nas suas dimensões física e emocional — sem que o doente tenha de se repetir, sem que o contexto de vida se perca na transição entre especialistas, e sem que a saúde mental seja tratada como uma questão secundária à saúde física.</p>
<p><strong>Medicina geral e cuidados primários:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, infecções urinárias</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, tiróide, colesterol</li>
<li>Medicina de urgência — avaliação de sintomas agudos e orientação sobre urgência real</li>
<li>Acompanhamento de doentes em hemodiálise — avaliação e orientação clínica</li>
<li>Medicina de viagem — consultas pré-viagem, vacinação, prescrições para viagem</li>
<li>Medicina móvel — orientação para viajantes internacionais em Portugal</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
</ul>
<p><strong>Psicologia clínica e da saúde:</strong></p>
<ul>
<li>Ansiedade, depressão, stress e insónia — avaliação e intervenção psicológica</li>
<li>Psicologia da saúde — apoio psicológico na gestão do peso e da dor crónica</li>
<li>Saúde mental perinatal e do bebé — apoio a pais, intervenção precoce, DIR®/Floortime, Circle of Security</li>
<li>Perturbações do desenvolvimento na infância — avaliação e orientação</li>
<li>Abordagem integrada saúde física–mental — para doentes com condições crónicas com componente psicológico</li>
</ul>
<p><strong>A sua abordagem:</strong> A Dra. Joana Branco Maia pratica uma medicina genuinamente holística — não como filosofia, mas como competência real. A formação simultânea em medicina e psicologia clínica permite-lhe identificar e tratar tanto os factores físicos como os psicológicos que contribuem para o bem-estar do doente, numa única consulta, com uma única profissional. Para doentes com condições em que o físico e o emocional se entrelaçam — dor crónica, insónia, gestão do peso, doença crónica com impacto emocional — esta abordagem integrada é excepcionalmente valiosa.</p>
<p><strong>Nota importante:</strong> Se está a experienciar uma crise psicológica ou pensamentos de autolesão, contacte a Linha de Apoio à Crise do SNS24 através do 1024 ou ligue ao 112 — não espere por uma consulta.</p>
`.trim(),
    qualifications: [
      "Médica de Clínica Geral — Divisão Geral, Ordem dos Médicos (OM 64572)",
      "Psicóloga Clínica — Ordem dos Psicólogos Portugueses (OPP 12055)",
      "PhD em Psicologia do Desenvolvimento",
      "Especialização em Psicologia Clínica e da Saúde",
      "Médica de Urgência — Hospital da Prelada, Porto",
      "Formação em Anestesiologia",
      "Experiência em hemodiálise, telemedicina e medicina móvel",
      "Formação avançada em DIR®/Floortime e Circle of Security — saúde mental do bebé e intervenção precoce",
    ],
    faqs: [
      {
        question: "A Dra. Joana Branco Maia é simultaneamente médica e psicóloga clínica?",
        answer:
          "Sim. A Dra. Joana Branco Maia está registada na Ordem dos Médicos (OM) com o número 64572 e na Ordem dos Psicólogos Portugueses (OPP) com o número 12055. Pode verificar o registo médico em ordemdosmedicos.pt e o registo de psicóloga em ordemdospsicologos.pt. Esta dupla habilitação com prática activa em ambas as áreas é excepcionalmente rara.",
      },
      {
        question: "O que oferece a Dra. Joana em consulta online?",
        answer:
          "A Dra. Joana oferece duas vertentes integradas em consulta online. Medicina geral: doença aguda, gestão de doenças crónicas, medicina de urgência, acompanhamento de doentes em hemodiálise, medicina de viagem, atestados e renovação de receitas. Psicologia clínica: ansiedade, depressão, stress e insónia, psicologia da saúde (gestão do peso e dor crónica), saúde mental perinatal e do bebé (DIR®/Floortime, Circle of Security) e abordagem integrada saúde física–mental.",
      },
      {
        question: "O que é a abordagem integrada medicina–psicologia e porque é relevante?",
        answer:
          "A maioria dos doentes com doenças crónicas, dor persistente, problemas de sono, dificuldades na gestão do peso ou condições cardiovasculares tem também uma dimensão psicológica que influencia significativamente o curso da doença e a resposta ao tratamento. Normalmente, estas duas dimensões são tratadas por profissionais diferentes, em consultas separadas, com perda de contexto e continuidade. A Dra. Joana é médica e psicóloga clínica em simultâneo — pode avaliar e tratar ambas as dimensões na mesma consulta, com o mesmo profissional, sem que o doente precise de se repetir ou de gerir dois processos paralelos.",
      },
      {
        question: "O que são o DIR®/Floortime e o Circle of Security e quando são recomendados?",
        answer:
          "DIR®/Floortime é um modelo de intervenção para crianças com perturbações do desenvolvimento — nomeadamente perturbações do espectro do autismo e outras dificuldades de processamento sensorial e relacional — que se centra no desenvolvimento emocional, na relação e na comunicação. O Circle of Security é um programa de intervenção precoce focado na vinculação segura entre pais e filhos, especialmente nos primeiros anos de vida. A Dra. Joana tem formação avançada em ambos os modelos e pode orientar pais e famílias que estejam a lidar com questões de desenvolvimento infantil, dificuldades relacionais precoces ou preocupações com o desenvolvimento emocional e social dos seus filhos.",
      },
      {
        question: "Como agendar uma consulta com a Dra. Joana Branco Maia?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com a Dra. Joana Branco Maia. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês ou espanhol. Se está a experienciar uma crise psicológica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112.",
      },
      {
        question: "Quais são as qualificações da Dra. Joana Branco Maia?",
        answer:
          "A Dra. Joana Branco Maia é médica registada na Ordem dos Médicos (OM 64572, Divisão Geral) e psicóloga clínica registada na Ordem dos Psicólogos Portugueses (OPP 12055). É doutorada em Psicologia do Desenvolvimento e tem especialização em Psicologia Clínica e da Saúde. Exerce como médica de urgência no Hospital da Prelada, Porto, com formação em anestesiologia e experiência em hemodiálise, telemedicina e medicina móvel. Tem formação avançada em DIR®/Floortime e Circle of Security para saúde mental do bebé e intervenção precoce. Consulta em português, inglês e espanhol.",
      },
    ],
  },

  // ── 8. Dr. João de Oliveira e Silva (Médico de Clínica Geral e Medicina Familiar) ──
  {
    dbSlug: "dr-joao-de-oliveira-e-silva",
    title: "Médico de Clínica Geral e Medicina Familiar",
    seoTitle: "Dr. João de Oliveira e Silva — Medicina Geral e Familiar | OM 68445 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. João de Oliveira e Silva — médico registado na OM (nº 68445). ICBAS Porto · Especialização Medicina Geral e Familiar · USF Salvador Machado · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. João de Oliveira e Silva é médico com formação em Medicina Geral e Familiar, licenciado com Mestrado Integrado em Medicina pelo Instituto de Ciências Biomédicas Abel Salazar (ICBAS), Universidade do Porto — uma das mais reconhecidas escolas médicas em Portugal.</p>
<p>Completou o Internato Médico Geral no Centro Hospitalar Entre Douro e Vouga, onde adquiriu experiência clínica abrangente em múltiplas especialidades hospitalares. Desde 2022, realiza a sua especialização em Medicina Geral e Familiar na USF Salvador Machado, prestando cuidados de saúde primários a pacientes de todas as idades — o contexto clínico mais próximo do que uma boa consulta online representa: acompanhamento longitudinal, gestão de doenças crónicas e cuidados preventivos centrados na pessoa e na família.</p>
<p>A Medicina Geral e Familiar é a especialidade médica mais abrangente do sistema de saúde — e a mais adequada para a grande maioria das situações de saúde do dia a dia. O Dr. João traz para a consulta online a abordagem de um médico de família em formação activa: actualizado, orientado para a continuidade do cuidado e focado na relação a longo prazo com o doente.</p>
<p>As suas áreas de interesse clínico incluem a medicina preventiva, a gestão de doenças crónicas e a continuidade do cuidado no contexto da medicina familiar. Tem competências digitais sólidas e experiência no uso de plataformas online para apoiar o cuidado ao doente — o que se traduz numa consulta de telemedicina fluida, clara e centrada no que o doente precisa.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, dor de garganta, infecções do ouvido</li>
<li>Infecções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, problemas da tiróide, colesterol elevado, asma</li>
<li>Medicina preventiva — rastreios, vacinação, avaliações de saúde, aconselhamento sobre estilo de vida</li>
<li>Saúde da família — cuidados a todas as idades, desde crianças a adultos e idosos</li>
<li>Saúde mental — ansiedade, depressão, gestão do stress e referenciação a especialistas</li>
<li>Acompanhamento de doenças crónicas — revisão de medicação, ajuste terapêutico, monitorização</li>
<li>Atestados médicos e declarações</li>
<li>Renovação de receitas e revisão de medicação</li>
<li>Referenciação para especialistas e meios complementares de diagnóstico</li>
</ul>
<p><strong>A sua abordagem:</strong> O Dr. João de Oliveira e Silva é comprometido com uma medicina centrada no doente, baseada em evidências e orientada para a acessibilidade e o seguimento a longo prazo. Na consulta online, isso traduz-se num médico que ouve com atenção, explica de forma clara e assegura que o doente sai da consulta com um plano concreto — não apenas com uma prescrição.</p>
`.trim(),
    qualifications: [
      "Médico de Clínica Geral — Divisão Geral, Ordem dos Médicos (OM 68445)",
      "Mestrado Integrado em Medicina — ICBAS, Instituto de Ciências Biomédicas Abel Salazar, Universidade do Porto",
      "Internato Médico Geral — Centro Hospitalar Entre Douro e Vouga",
      "Especialização em Medicina Geral e Familiar — USF Salvador Machado (desde 2022)",
    ],
    faqs: [
      {
        question: "O Dr. João de Oliveira e Silva está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. João de Oliveira e Silva está registado na Ordem dos Médicos (OM) com o número 68445, na Divisão Geral. Pode verificar este registo em ordemdosmedicos.pt. O Dr. João é licenciado em Medicina pelo ICBAS, Universidade do Porto, e realiza actualmente a sua especialização em Medicina Geral e Familiar na USF Salvador Machado desde 2022.",
      },
      {
        question: "O que trata o Dr. João de Oliveira e Silva em consulta online?",
        answer:
          "O Dr. João oferece consultas de clínica geral e medicina familiar online para: doença aguda (infecções respiratórias, febre, gripe, infecções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol, asma), medicina preventiva (rastreios, vacinação, avaliações de saúde), saúde da família (todas as idades), saúde mental (ansiedade, depressão, stress), acompanhamento de medicação, atestados, renovação de receitas e referenciação a especialistas.",
      },
      {
        question: "O Dr. João está em especialização — isso afecta a qualidade da consulta?",
        answer:
          "Não — pelo contrário. A especialização em Medicina Geral e Familiar na USF Salvador Machado significa prática clínica activa diária com supervisão especializada e acesso às orientações clínicas mais actuais. Em telemedicina, um médico em especialização activa traz frequentemente orientação clínica mais recente do que prática estabelecida sem actualização formal.",
      },
      {
        question: "O que é a Medicina Geral e Familiar e quando devo escolher um médico de família em vez de um especialista?",
        answer:
          "A Medicina Geral e Familiar é a especialidade médica que acompanha o doente de forma longitudinal e abrangente — ao longo do tempo, em todas as fases da vida e em todas as áreas da saúde. É a primeira linha de cuidados para a grande maioria das situações de saúde: doença aguda, gestão de doenças crónicas, medicina preventiva, saúde mental ligeira a moderada e orientação para especialistas quando necessário. Para a maioria das situações do dia a dia — um sintoma novo, uma dúvida sobre medicação, uma renovação de receita ou uma avaliação de saúde preventiva — uma consulta com o Dr. João é a resposta mais adequada, mais eficiente e mais acessível.",
      },
      {
        question: "Como agendar uma consulta com o Dr. João de Oliveira e Silva?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. João de Oliveira e Silva. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações do Dr. João de Oliveira e Silva?",
        answer:
          "O Dr. João de Oliveira e Silva é licenciado em Medicina com Mestrado Integrado pelo ICBAS, Universidade do Porto. Completou o Internato Médico Geral no Centro Hospitalar Entre Douro e Vouga e realiza desde 2022 a sua especialização em Medicina Geral e Familiar na USF Salvador Machado. Está registado na Ordem dos Médicos (OM 68445, Divisão Geral). Tem competências digitais sólidas e experiência em telemedicina. Consulta em português e inglês.",
      },
    ],
  },

  // ── 9. Dr. Lucas Alvarenga Berto (Médico de Clínica Geral) ───────────────
  {
    dbSlug: "dr-lucas-alvarenga-berto",
    title: "Médico de Clínica Geral",
    seoTitle: "Dr. Lucas Alvarenga Berto — Médico de Clínica Geral | OM 79932 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Lucas Alvarenga Berto — médico registado na OM (nº 79932). Medicina de emergência · ULS Matosinhos · Trofa Saúde · Residência Medicina Interna · ACLS AHA · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Lucas Alvarenga Berto é médico formado pela Universidade José do Rosário Vellano (UNIFENAS, Brasil), com diploma reconhecido em Portugal pela Universidade do Porto e autorização para exercer medicina de forma independente em Portugal. Está actualmente a concluir um Mestrado em Exercício e Saúde na Universidade Lusófona do Porto — uma formação que aprofunda a sua abordagem integrada à saúde, prevenção e desempenho físico.</p>
<p>A sua experiência clínica combina três vertentes complementares: medicina de emergência, medicina interna e telemedicina. Em Portugal, trabalhou em instituições de referência como a ULS Matosinhos e a Trofa Saúde — nas unidades de Alfena e Bonfim — onde adquiriu experiência sólida em contextos de urgência e cuidados agudos de elevada exigência clínica. Tem também experiência em clínica médica, medicina de família, medicina desportiva e acompanhamento de atletas.</p>
<p>Concluiu a residência médica em Medicina Interna, com estágios clínicos em cardiologia, terapia intensiva, nefrologia, doenças infecciosas e medicina de família, realizados no Brasil, em Portugal e em França — uma exposição multidisciplinar em três sistemas de saúde diferentes que lhe confere uma perspectiva clínica abrangente e contextualizada.</p>
<p>Possui certificação em Suporte Avançado de Vida Cardiovascular (ACLS) pela American Heart Association e participa activamente em congressos científicos, mantendo-se em permanente actualização e aderindo à medicina baseada em evidências.</p>
<p>A sua formação em medicina desportiva e o Mestrado em Exercício e Saúde em curso tornam-no um médico particularmente bem posicionado para doentes que queiram integrar saúde, prevenção e actividade física numa abordagem médica coerente — não apenas tratar sintomas, mas acompanhar a saúde no seu sentido mais amplo.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, dor de garganta, infecções do ouvido</li>
<li>Infecções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, problemas da tiróide, colesterol, asma</li>
<li>Medicina interna — avaliação e orientação clínica de condições sistémicas</li>
<li>Medicina desportiva — avaliação médica de atletas, lesões desportivas, aptidão física e saúde</li>
<li>Exercício e saúde — integração de actividade física no acompanhamento de condições crónicas</li>
<li>Avaliação cardiovascular — palpitações, dor torácica, avaliação de risco cardiovascular</li>
<li>Saúde preventiva — rastreios, avaliações de saúde, vacinação, aconselhamento sobre estilo de vida</li>
<li>Saúde mental — ansiedade, depressão, gestão do stress e referenciação a especialistas</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
<li>Referenciação para especialistas e meios complementares de diagnóstico</li>
</ul>
<p><strong>A sua abordagem:</strong> O Dr. Lucas Alvarenga Berto pratica uma medicina compassiva, rigorosa e centrada no doente — com foco na prevenção, no diagnóstico preciso e no acompanhamento contínuo. A sua experiência simultânea em medicina de emergência e medicina de família confere-lhe a capacidade de avaliar rapidamente a gravidade de qualquer situação e de orientar o doente com clareza — seja para cuidados imediatos ou para um plano de saúde a longo prazo.</p>
`.trim(),
    qualifications: [
      "Médico de Clínica Geral — Divisão Geral, Ordem dos Médicos (OM 79932)",
      "Licenciado em Medicina — Universidade José do Rosário Vellano (UNIFENAS), Brasil · Diploma reconhecido pela Universidade do Porto",
      "Residência em Medicina Interna — com estágios em cardiologia, terapia intensiva, nefrologia, doenças infecciosas e medicina de família (Brasil, Portugal e França)",
      "Mestrado em Exercício e Saúde — Universidade Lusófona do Porto (em curso)",
      "Medicina de Emergência — ULS Matosinhos, Trofa Saúde Alfena e Trofa Saúde Bonfim",
      "Certificação ACLS — Suporte Avançado de Vida Cardiovascular, American Heart Association",
      "Experiência em medicina desportiva e acompanhamento de atletas",
      "Experiência em telemedicina",
    ],
    faqs: [
      {
        question: "O Dr. Lucas Alvarenga Berto está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. Lucas Alvarenga Berto está registado na Ordem dos Médicos (OM) com o número 79932, na Divisão Geral. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Lucas formou-se em Medicina pela UNIFENAS, com diploma reconhecido pela Universidade do Porto, e tem experiência clínica em medicina de emergência na ULS Matosinhos e na Trofa Saúde, e residência concluída em Medicina Interna.",
      },
      {
        question: "O que trata o Dr. Lucas Alvarenga Berto em consulta online?",
        answer:
          "O Dr. Lucas oferece consultas de clínica geral online para: doença aguda (infecções respiratórias, febre, gripe, infecções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol, asma), medicina interna, medicina desportiva (avaliação de atletas, lesões desportivas, aptidão física), exercício e saúde, avaliação cardiovascular, saúde preventiva, saúde mental (ansiedade, depressão), atestados, renovação de receitas e referenciação a especialistas.",
      },
      {
        question: "O Dr. Lucas tem experiência em medicina desportiva e pode acompanhar atletas ou pessoas activas?",
        answer:
          "Sim. O Dr. Lucas tem experiência em medicina desportiva e acompanhamento de atletas, e está a concluir um Mestrado em Exercício e Saúde na Universidade Lusófona do Porto. Para doentes que praticam desporto de forma regular ou competitiva, que procuram uma avaliação médica antes de iniciar um programa de exercício, ou que querem integrar a actividade física no acompanhamento de uma condição crónica — como hipertensão, diabetes ou excesso de peso — o Dr. Lucas oferece uma perspectiva médica mais completa do que a maioria dos médicos de clínica geral.",
      },
      {
        question: "O Dr. Lucas tem certificação em emergência cardiovascular?",
        answer:
          "Sim. O Dr. Lucas possui certificação em Suporte Avançado de Vida Cardiovascular (ACLS) pela American Heart Association — o padrão internacional de referência para a gestão de emergências cardiovasculares. A sua experiência em medicina de emergência na ULS Matosinhos e na Trofa Saúde reforça esta competência. Em consulta online, isso traduz-se na capacidade de avaliar com precisão sintomas cardiovasculares — palpitações, dor torácica, dispneia — e de orientar o doente com clareza sobre a urgência real da situação.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Lucas Alvarenga Berto?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Lucas Alvarenga Berto. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações do Dr. Lucas Alvarenga Berto?",
        answer:
          "O Dr. Lucas Alvarenga Berto formou-se em Medicina pela UNIFENAS (Brasil), com diploma reconhecido pela Universidade do Porto. Concluiu a residência em Medicina Interna com estágios em cardiologia, terapia intensiva, nefrologia, doenças infecciosas e medicina de família no Brasil, Portugal e França. Tem experiência em medicina de emergência na ULS Matosinhos e na Trofa Saúde (Alfena e Bonfim), certificação ACLS pela American Heart Association e experiência em medicina desportiva e telemedicina. Está a concluir um Mestrado em Exercício e Saúde na Universidade Lusófona do Porto. Registado na OM (OM 79932, Divisão Geral).",
      },
    ],
  },

  // ── 10. Dra. Margarida Andrade (Médica de Clínica Geral e Medicina Familiar) ──
  {
    dbSlug: "dr-margarida-andrade",
    fullNameFix: "Dra. Margarida Domingues e Andrade",
    title: "Médica de Clínica Geral e Medicina Familiar",
    seoTitle: "Dra. Margarida Andrade — Medicina Geral e Familiar | OM 78297 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dra. Margarida Andrade — médica registada na OM (nº 78297). Internato Hospital Beatriz Ângelo · USF Colina de Odivelas · Urgência, Pediatria e MGF · Português, inglês e espanhol. Consulta no mesmo dia.",
    bio: `
<p>A Dra. Margarida Domingues e Andrade é médica com uma formação clínica abrangente e uma abordagem holística e centrada no doente — combinando raciocínio clínico sólido com um interesse particular na gestão e organização em saúde que lhe confere uma visão estratégica para além da consulta individual.</p>
<p>Concluiu o Internato de Formação Geral no Hospital Beatriz Ângelo, em Lisboa — um dos hospitais mais modernos e bem equipados de Portugal — onde adquiriu experiência prática em Medicina de Urgência Geral, Medicina Interna, Cirurgia Geral, Pediatria, Medicina Geral e Familiar e Saúde Pública. Esta exposição multidisciplinar em contexto hospitalar de referência confere-lhe um raciocínio clínico robusto tanto em cuidados agudos de adultos e crianças como em contexto de consulta externa.</p>
<p>Encontra-se actualmente a iniciar a sua Formação Especializada em Medicina Geral e Familiar na USF Colina de Odivelas, Unidade de Saúde Loures-Odivelas — o contexto clínico mais próximo do que uma boa consulta online representa: acompanhamento longitudinal, gestão abrangente da saúde e cuidados centrados na pessoa e na família. É certificada em Suporte Básico de Vida com Desfibrilhação Automática Externa (SBV-DAE).</p>
<p>A Dra. Margarida é fluente em português, inglês (C2) e espanhol (C2) — o que lhe permite consultar com o mesmo rigor clínico em três idiomas, tornando-a acessível a doentes portugueses, anglófonos e hispanofalantes.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, dor de garganta, infecções do ouvido</li>
<li>Infecções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, problemas da tiróide, colesterol, asma</li>
<li>Medicina de urgência — avaliação de sintomas agudos e orientação sobre urgência real</li>
<li>Saúde pediátrica — avaliação de sintomas em crianças e adolescentes, orientação a pais</li>
<li>Medicina interna — avaliação e orientação de condições sistémicas</li>
<li>Saúde preventiva e Saúde Pública — rastreios, vacinação, avaliações de saúde, estilos de vida</li>
<li>Saúde mental — ansiedade, depressão, gestão do stress e referenciação a especialistas</li>
<li>Saúde da mulher — contraceção, saúde reprodutiva, rastreios ginecológicos</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
<li>Referenciação para especialistas e meios complementares de diagnóstico</li>
</ul>
<p><strong>A sua abordagem:</strong> A Dra. Margarida Andrade é comprometida com uma medicina empática, baseada em evidências e de elevada qualidade — com particular atenção ao acompanhamento abrangente e a longo prazo. A sua formação transversal em múltiplas especialidades hospitalares permite-lhe abordar qualquer situação clínica com um raciocínio diferencial completo, enquanto a sua aposta na gestão em saúde lhe confere uma perspectiva sistémica sobre o cuidado ao doente.</p>
`.trim(),
    qualifications: [
      "Médica de Clínica Geral — Ordem dos Médicos (OM 78297)",
      "Formação Especializada em Medicina Geral e Familiar — USF Colina de Odivelas, Loures-Odivelas (em curso)",
      "Internato de Formação Geral — Hospital Beatriz Ângelo, Lisboa",
      "Formação em Medicina de Urgência, Medicina Interna, Cirurgia Geral, Pediatria, MGF e Saúde Pública",
      "Certificação SBV-DAE — Suporte Básico de Vida com Desfibrilhação Automática Externa",
      "Formação avançada em gestão e organização em saúde",
    ],
    faqs: [
      {
        question: "A Dra. Margarida Andrade está registada na Ordem dos Médicos?",
        answer:
          "Sim. A Dra. Margarida Domingues e Andrade está registada na Ordem dos Médicos (OM) com o número 78297. Pode verificar este registo em ordemdosmedicos.pt. A Dra. Margarida concluiu o Internato de Formação Geral no Hospital Beatriz Ângelo, em Lisboa, e encontra-se actualmente a realizar a Formação Especializada em Medicina Geral e Familiar na USF Colina de Odivelas.",
      },
      {
        question: "O que trata a Dra. Margarida Andrade em consulta online?",
        answer:
          "A Dra. Margarida oferece consultas de clínica geral e medicina familiar online para: doença aguda (infecções respiratórias, febre, gripe, infecções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol, asma), medicina de urgência (avaliação de sintomas agudos), saúde pediátrica (crianças e adolescentes), medicina interna, saúde preventiva e Saúde Pública, saúde mental (ansiedade, depressão, stress), saúde da mulher, atestados, renovação de receitas e referenciação a especialistas.",
      },
      {
        question: "A Dra. Margarida pode consultar em espanhol ou inglês?",
        answer:
          "Sim. A Dra. Margarida é fluente em inglês e espanhol, ambos ao nível C2 — o nível mais elevado na escala de proficiência linguística europeia, equivalente a fluência nativa. Esta competência trilingue torna-a acessível a doentes portugueses, britânicos, americanos, espanhóis, latino-americanos e outros hispanofalantes que necessitem de uma consulta médica em Portugal com o mesmo rigor clínico em qualquer dos três idiomas.",
      },
      {
        question: "A Dra. Margarida tem experiência em saúde pediátrica?",
        answer:
          "Sim. A Dra. Margarida adquiriu experiência em Pediatria durante o seu Internato de Formação Geral no Hospital Beatriz Ângelo, incluindo cuidados agudos pediátricos e consulta externa. Para pais que procuram orientação médica fiável sobre sintomas nos seus filhos — febre, infecções recorrentes, questões de desenvolvimento ou dúvidas gerais de saúde pediátrica — a consulta online com a Dra. Margarida é uma opção acessível e eficaz sem necessidade de deslocação ao centro de saúde ou urgência pediátrica.",
      },
      {
        question: "Como agendar uma consulta com a Dra. Margarida Andrade?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com a Dra. Margarida Domingues e Andrade. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês ou espanhol. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações da Dra. Margarida Andrade?",
        answer:
          "A Dra. Margarida Domingues e Andrade está registada na Ordem dos Médicos (OM 78297). Concluiu o Internato de Formação Geral no Hospital Beatriz Ângelo, em Lisboa, com formação em Medicina de Urgência, Medicina Interna, Cirurgia Geral, Pediatria, Medicina Geral e Familiar e Saúde Pública. Encontra-se actualmente a realizar a Formação Especializada em Medicina Geral e Familiar na USF Colina de Odivelas. É certificada em SBV-DAE e fluente em português, inglês (C2) e espanhol (C2).",
      },
    ],
  },

  // ── 11. Dr. Martim Delgado (Médico de Clínica Geral e Medicina Familiar) ──
  {
    dbSlug: "dr-martim-delgado",
    title: "Médico de Clínica Geral e Medicina Familiar",
    seoTitle: "Dr. Martim Delgado — Medicina Geral e Familiar | OM 70349 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Martim Delgado — médico registado na OM (nº 70349). Faculdade de Medicina Masaryk Brno · Hospital de Santa Maria Lisboa · MGF · Telemedicina · Português, inglês, espanhol e checo. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Martim Delgado é médico de clínica geral e medicina familiar com uma formação clínica abrangente que combina experiência hospitalar em contextos de referência, prática em cuidados primários, rotações em urgência e experiência activa em telemedicina.</p>
<p>Formou-se em Medicina com Mestrado Integrado pela Faculdade de Medicina da Universidade de Masaryk, em Brno, República Checa — uma das escolas médicas mais reconhecidas internacionalmente na Europa Central — com resultados académicos sólidos e formação transversal em Medicina Interna, Cirurgia, Pediatria, Medicina Preventiva, Saúde Comunitária e Prática Clínica. Esta formação europeia em contexto internacional confere-lhe desde o início uma perspectiva multissistémica e multicultural da medicina.</p>
<p>Completou o Internato de Formação Geral no Hospital de Santa Maria, em Lisboa — o maior hospital universitário de Portugal e um dos centros de referência nacionais — com rotações em Medicina Interna, Cirurgia Geral, Pediatria e Cuidados Primários. Realizou ainda estágios hospitalares especializados em Urgência de Pediatria, Psiquiatria da Infância e Cardiologia, aprofundando competências multidisciplinares. Completou a sua Formação Especializada em Medicina Geral e Familiar na USF São João Evangelista dos Lóios, onde prestou consultas a adultos e crianças, cuidados de saúde materna e planeamento familiar, consultas de doença aguda e rotações em urgência de Cirurgia Geral, Ortopedia e Ginecologia e Obstetrícia.</p>
<p>Em paralelo, desenvolveu experiência em telemedicina, realizando consultas remotas para adultos e crianças, incluindo avaliação de doença aguda e prescrição de exames complementares. Participou em investigação clínica e apresentações de casos, incluindo participação na conferência internacional WONCA — a principal organização mundial de Medicina Geral e Familiar.</p>
<p>Os seus quatro idiomas — português, inglês, espanhol e checo — reflectem o seu percurso académico e clínico internacional e tornam-no um dos médicos mais acessíveis linguisticamente na plataforma Global Health Portugal.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, dor de garganta, infecções do ouvido</li>
<li>Infecções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, tiróide, colesterol elevado, asma</li>
<li>Saúde pediátrica — consultas de adultos e crianças, avaliação de urgência pediátrica</li>
<li>Saúde materna e planeamento familiar — saúde na gravidez, contraceção, saúde reprodutiva</li>
<li>Saúde mental — ansiedade, depressão, stress e referenciação a especialistas</li>
<li>Psiquiatria da infância — orientação a pais sobre comportamento e saúde mental em crianças</li>
<li>Medicina preventiva — rastreios, vacinação, avaliações de saúde, aconselhamento</li>
<li>Avaliação cardiovascular — palpitações, risco cardiovascular, orientação clínica</li>
<li>Medicina de urgência — avaliação de sintomas agudos e orientação sobre urgência real</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
<li>Referenciação para especialistas e prescrição de meios complementares de diagnóstico</li>
</ul>
<p><strong>A sua abordagem:</strong> O Dr. Martim Delgado é reconhecido pela sua abordagem centrada no doente, raciocínio clínico sólido e capacidade de trabalhar com igual eficácia em contextos presenciais e digitais. A sua formação abrangente permite-lhe gerir cuidados preventivos, acompanhamento de doenças crónicas, condições médicas agudas e medicina familiar em todas as faixas etárias — com a clareza e a atenção ao contexto de vida de cada doente que caracterizam a melhor medicina de família.</p>
`.trim(),
    qualifications: [
      "Médico de Clínica Geral — Divisão Geral, Ordem dos Médicos (OM 70349)",
      "Mestrado Integrado em Medicina — Faculdade de Medicina, Universidade de Masaryk, Brno, República Checa",
      "Internato de Formação Geral — Hospital de Santa Maria, Lisboa",
      "Formação Especializada em Medicina Geral e Familiar — USF São João Evangelista dos Lóios (2023–2025)",
      "Estágios especializados em Urgência de Pediatria, Psiquiatria da Infância e Cardiologia",
      "BLS — Basic Life Support, European Resuscitation Council",
      "Certificações: Uso racional de exames de diagnóstico · Uso racional de antimicrobianos · Utilização de componentes sanguíneos · Formação em serviço de urgência",
      "Participação em investigação clínica e conferência internacional WONCA",
      "Experiência em telemedicina",
    ],
    faqs: [
      {
        question: "O Dr. Martim Delgado está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. Martim Delgado está registado na Ordem dos Médicos (OM) com o número 70349, na Divisão Geral. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Martim formou-se em Medicina pela Faculdade de Medicina da Universidade de Masaryk em Brno, completou o Internato no Hospital de Santa Maria em Lisboa e a Formação Especializada em Medicina Geral e Familiar na USF São João Evangelista dos Lóios.",
      },
      {
        question: "O que trata o Dr. Martim Delgado em consulta online?",
        answer:
          "O Dr. Martim oferece consultas de clínica geral e medicina familiar online para: doença aguda (infecções respiratórias, febre, gripe, infecções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol, asma), saúde pediátrica (adultos e crianças), saúde materna e planeamento familiar, saúde mental (ansiedade, depressão), psiquiatria da infância (orientação a pais), medicina preventiva, avaliação cardiovascular, medicina de urgência, atestados, renovação de receitas e referenciação a especialistas.",
      },
      {
        question: "O Dr. Martim tem experiência específica em saúde pediátrica e urgência pediátrica?",
        answer:
          "Sim. Para além das consultas pediátricas regulares na USF São João Evangelista dos Lóios, o Dr. Martim realizou um estágio especializado em Urgência de Pediatria e em Psiquiatria da Infância — o que lhe confere competências específicas tanto na avaliação de crianças com doença aguda como na orientação a pais sobre questões de comportamento, desenvolvimento e saúde mental infantil. Para pais que procuram uma avaliação pediátrica fiável sem necessidade de recorrer à urgência pediátrica, ou que têm dúvidas sobre o desenvolvimento ou comportamento dos seus filhos, o Dr. Martim é uma opção especialmente bem posicionada.",
      },
      {
        question: "O Dr. Martim pode consultar em checo? Para que tipo de doentes é relevante?",
        answer:
          "Sim. O Dr. Martim fala checo — adquirido durante a sua formação médica na Universidade de Masaryk em Brno, onde completou o Mestrado Integrado em Medicina. Para cidadãos checos, eslovacos ou outros falantes de checo a residir ou de visita em Portugal que necessitem de uma consulta médica no seu idioma nativo — ou que prefiram comunicar em checo por questões de conforto e precisão na descrição de sintomas — o Dr. Martim é praticamente único neste mercado.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Martim Delgado?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Martim Delgado. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês, espanhol ou checo. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações do Dr. Martim Delgado?",
        answer:
          "O Dr. Martim Delgado é licenciado com Mestrado Integrado em Medicina pela Faculdade de Medicina da Universidade de Masaryk em Brno. Completou o Internato de Formação Geral no Hospital de Santa Maria, Lisboa, com estágios especializados em Urgência de Pediatria, Psiquiatria da Infância e Cardiologia. Realizou a Formação Especializada em Medicina Geral e Familiar na USF São João Evangelista dos Lóios (2023–2025) e tem experiência activa em telemedicina. Participou na conferência internacional WONCA. Possui certificação BLS pelo European Resuscitation Council e certificações em uso racional de antimicrobianos, exames de diagnóstico e componentes sanguíneos. Registado na OM (nº 70349, Divisão Geral). Consulta em português, inglês, espanhol e checo.",
      },
    ],
  },

  // ── 12. Dr. Pedro Santos (Oncologista Médico) ────────────────────────────
  {
    dbSlug: "dr-pedro-santos",
    title: "Oncologista Médico",
    seoTitle: "Dr. Pedro Santos — Oncologista Médico | OM 33133 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Pedro Santos — oncologista médico registado na OM (nº 33133). 30+ anos experiência · IPO Porto · Director Oncologia CHUA · Professor UBI · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Pedro Santos é oncologista médico com mais de trinta anos de experiência clínica, académica e de liderança em oncologia no sistema de saúde português — um dos oncologistas com maior profundidade de experiência institucional e académica disponíveis para consulta online em Portugal.</p>
<p>Licenciou-se em Medicina e Cirurgia pela Faculdade de Medicina da Universidade de Lisboa em 1989 e concluiu a especialização em Oncologia Médica no Instituto Português de Oncologia (IPO) Francisco Gentil, no Porto — o centro de referência nacional em oncologia — iniciando a sua carreira médica em 1990. Ao longo de três décadas, desempenhou cargos de direcção e liderança em grandes hospitais públicos portugueses: Director do Serviço de Oncologia Médica e Presidente da Comissão de Oncologia do Centro Hospitalar Universitário do Algarve, supervisionando os serviços oncológicos dos hospitais de Faro e Portimão, e funções de direcção e coordenação no Centro Hospitalar de Trás-os-Montes e Alto Douro e no Centro Hospitalar Entre Douro e Vouga.</p>
<p>A componente académica é igualmente significativa: foi Professor Assistente no Mestrado em Oncologia da Universidade da Beira Interior, supervisionou internos e médicos em formação especializada, e contribuiu para publicações científicas em oncologia. Liderou centros de investigação clínica, coordenou unidades de hospital de dia de oncologia, participou em comissões de farmácia e terapêutica e em iniciativas nacionais de planeamento oncológico.</p>
<p>Trinta anos de oncologia clínica activa e de liderança institucional criam um tipo de conhecimento que vai muito além do que é ensinado nas faculdades — o reconhecimento de padrões clínicos raros, a capacidade de contextualizar resultados dentro do espectro real da doença oncológica, e a experiência de ter acompanhado milhares de doentes em todas as fases da doença, do diagnóstico ao fim de vida. Para um doente com cancro — ou para um familiar que o acompanha — esta profundidade de experiência é insubstituível.</p>
<p><strong>O que oferece online:</strong></p>
<ul>
<li>Segunda opinião oncológica — revisão independente de diagnóstico, biópsias, imagem e planos de tratamento</li>
<li>Interpretação de resultados oncológicos — PET-CT, marcadores tumorais, testes moleculares, relatórios de biópsia</li>
<li>Oncologia geral — avaliação de qualquer tipo de tumor com perspectiva especializada</li>
<li>Orientação sobre quimioterapia e imunoterapia — efeitos secundários, tolerância, ajuste de dose, opções alternativas</li>
<li>Acompanhamento pós-tratamento — vigilância oncológica, gestão de efeitos a longo prazo</li>
<li>Cancro do pulmão, gastrointestinal, urológico, cabeça e pescoço e outros — com experiência clínica em múltiplos grupos de tumores</li>
<li>Orientação sobre ensaios clínicos — disponibilidade, elegibilidade e implicações</li>
<li>Cuidados paliativos oncológicos — controlo de sintomas, qualidade de vida em doença avançada</li>
<li>Apoio ao doente e família — orientação em momentos de decisão clínica complexa</li>
<li>Relatórios médicos e referenciação</li>
</ul>
<p><strong>Nota importante:</strong> O Dr. Pedro Santos não administra quimioterapia, radioterapia nem realiza procedimentos invasivos através de videochamada. A consulta online oferece avaliação clínica especializada, segunda opinião e orientação — com especial valor para doentes que querem clareza antes de uma decisão, ou que procuram uma perspectiva oncológica experiente adicional sobre o seu caso. Se está a viver uma emergência oncológica, dirija-se ao serviço de urgência mais próximo ou contacte o 112.</p>
<p><strong>A sua abordagem:</strong> O Dr. Pedro Santos é amplamente reconhecido pelo seu compromisso com cuidados oncológicos centrados no doente, colaboração multidisciplinar e melhoria contínua da qualidade dos serviços de oncologia. Trinta anos a liderar serviços de oncologia em hospitais públicos portugueses ensinaram-lhe algo que nenhuma publicação científica consegue transmitir completamente: que cada doente com cancro é uma pessoa — com medos, expectativas e contexto de vida próprios — e que uma boa consulta oncológica começa por reconhecer isso.</p>
`.trim(),
    qualifications: [
      "Oncologista Médico — Divisão de Especialista, Ordem dos Médicos (OM 33133)",
      "Licenciado em Medicina e Cirurgia — Faculdade de Medicina, Universidade de Lisboa (1989)",
      "Especialização em Oncologia Médica — Instituto Português de Oncologia (IPO) Francisco Gentil, Porto",
      "Director do Serviço de Oncologia Médica — Centro Hospitalar Universitário do Algarve (Faro e Portimão)",
      "Presidente da Comissão de Oncologia — CHUA",
      "Funções de direcção e coordenação — CH Trás-os-Montes e Alto Douro · CH Entre Douro e Vouga",
      "Professor Assistente no Mestrado em Oncologia — Universidade da Beira Interior",
      "Líder de centros de investigação clínica em oncologia",
      "Publicações científicas em oncologia",
      "30+ anos de experiência clínica em oncologia",
    ],
    faqs: [
      {
        question: "O Dr. Pedro Santos está registado na Ordem dos Médicos com especialidade em Oncologia Médica?",
        answer:
          "Sim. O Dr. Pedro Santos está registado na Ordem dos Médicos (OM) com o número 33133, na Divisão de Especialista. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Santos é especialista em Oncologia Médica com formação no IPO Francisco Gentil Porto e mais de trinta anos de experiência clínica e de liderança em oncologia no sistema de saúde português.",
      },
      {
        question: "O que oferece o Dr. Pedro Santos em consulta online?",
        answer:
          "O Dr. Pedro Santos oferece consultas oncológicas online para: segunda opinião (diagnóstico, biópsias, imagem, planos de tratamento), interpretação de resultados oncológicos (PET-CT, marcadores tumorais, testes moleculares), oncologia geral (múltiplos grupos de tumores), orientação sobre quimioterapia e imunoterapia (efeitos secundários, opções alternativas), acompanhamento pós-tratamento, orientação sobre ensaios clínicos, cuidados paliativos oncológicos e apoio ao doente e família. A consulta online não inclui administração de quimioterapia, radioterapia nem procedimentos invasivos.",
      },
      {
        question: "O que distingue o Dr. Pedro Santos de outros oncologistas disponíveis online?",
        answer:
          "O Dr. Pedro Santos combina três elementos excepcionais num único perfil: mais de trinta anos de experiência clínica activa em oncologia — iniciada no IPO Francisco Gentil Porto, o centro de referência nacional; experiência de liderança institucional como Director do Serviço de Oncologia Médica do CHUA e funções equivalentes noutros hospitais centrais; e uma componente académica como Professor no Mestrado em Oncologia da UBI e líder de centros de investigação clínica. Para doentes que procuram uma segunda opinião oncológica com o maior nível possível de experiência e contexto clínico nacional, o Dr. Pedro Santos representa uma referência raramente acessível de forma directa.",
      },
      {
        question: "Posso pedir uma segunda opinião oncológica ao Dr. Santos sobre o meu diagnóstico ou plano de tratamento?",
        answer:
          "Sim. A segunda opinião oncológica é uma das principais valências da consulta online com o Dr. Pedro Santos. Pode partilhar antes da consulta relatórios de biópsia, PET-CT, análises com marcadores tumorais, testes moleculares e cartas do oncologista que o acompanha — o Dr. Santos irá rever toda a informação disponível, contextualizar os resultados e oferecer a sua perspectiva especializada sobre o diagnóstico e as opções de tratamento disponíveis. Uma segunda opinião oncológica não substitui o médico que o acompanha — complementa-o, e pode fazer uma diferença real na qualidade das decisões que têm de ser tomadas.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Pedro Santos?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Pedro Santos. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Se tiver relatórios de PET-CT, biopsias, análises com marcadores tumorais ou cartas do oncologista que o acompanha, partilhe-os antes da consulta para uma avaliação mais completa.",
      },
      {
        question: "Quais são as qualificações do Dr. Pedro Santos?",
        answer:
          "O Dr. Pedro Santos licenciou-se em Medicina e Cirurgia pela Faculdade de Medicina da Universidade de Lisboa em 1989 e especializou-se em Oncologia Médica no IPO Francisco Gentil, Porto. Foi Director do Serviço de Oncologia Médica e Presidente da Comissão de Oncologia do CHUA (Faro e Portimão), com funções anteriores de direcção no CH Trás-os-Montes e Alto Douro e no CH Entre Douro e Vouga. Foi Professor Assistente no Mestrado em Oncologia da Universidade da Beira Interior e liderou centros de investigação clínica oncológica. Tem publicações científicas em oncologia e mais de trinta anos de experiência clínica activa. Registado na OM (nº 33133, Divisão de Especialista).",
      },
    ],
  },

  // ── 13. Dr. Rúben Pereira (Médico de Clínica Geral — Psiquiatria e Medicina Desportiva) ──
  {
    dbSlug: "dr-ruben-pereira",
    title: "Médico de Clínica Geral — Psiquiatria e Medicina Desportiva",
    seoTitle: "Dr. Rúben Pereira — Clínica Geral e Psiquiatria | OM 77228 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Rúben Pereira — médico registado na OM (nº 77228). FMUL · Interno Psiquiatria ULS Leiria · Medicina Desportiva · Diploma FIFA · Publicações PubMed · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Rúben Pereira é médico com uma formação académica e clínica excepcionalmente abrangente — uma combinação de psiquiatria, medicina desportiva, oncologia e bioquímica que raramente se encontra num único profissional de saúde.</p>
<p>Licenciou-se em Medicina com Mestrado Integrado pela Faculdade de Medicina da Universidade de Lisboa (FMUL) — a escola médica de referência em Portugal. O seu percurso académico reflecte uma curiosidade clínica e científica invulgar: além do curso de medicina, tem uma Licenciatura em Bioquímica pela Universidade de Aveiro — que lhe confere uma base científica aprofundada ao nível molecular — e um Mestrado em Oncologia pelo ICBAS, Universidade do Porto. Na área do desempenho físico e medicina desportiva, concluiu uma Pós-Graduação em Medicina Desportiva pela Faculdade de Medicina da Universidade do Porto e detém o Diploma FIFA em Medicina do Futebol — a certificação de referência internacional nesta área. Tem publicações indexadas na PubMed, reflectindo o seu envolvimento activo em investigação científica.</p>
<p>Actualmente, exerce como Médico Interno de Formação Especializada em Psiquiatria na Unidade Local de Saúde da Região de Leiria, onde aprofunda competências na avaliação, diagnóstico e tratamento de perturbações da saúde mental. Paralelamente, exerceu funções em Serviços de Urgência na ULS Gaia e Espinho e na ULS Aveiro — dois contextos de urgência hospitalar de elevada exigência — acompanhando situações médicas e psiquiátricas agudas.</p>
<p>Para doentes que procuram um médico que compreenda a saúde de forma verdadeiramente integrada — onde a saúde mental, o desempenho físico, a bioquímica do organismo e o contexto de vida se intersectam — o Dr. Rúben oferece uma perspectiva clínica que ultrapassa em muito o que está tipicamente disponível numa consulta de clínica geral.</p>
<p><strong>Clínica geral e cuidados primários:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, infecções urinárias</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, tiróide, colesterol, asma</li>
<li>Medicina de urgência — avaliação de sintomas agudos e orientação sobre urgência real</li>
<li>Saúde preventiva — rastreios, vacinação, avaliações de saúde, aconselhamento</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
</ul>
<p><strong>Saúde mental:</strong></p>
<ul>
<li>Ansiedade — ansiedade generalizada, ansiedade social, ataques de pânico</li>
<li>Depressão e humor baixo — avaliação, orientação e referenciação a especialistas</li>
<li>Perturbações do sono — insónia, hipersónia, avaliação de padrões de sono</li>
<li>Stress e burnout — avaliação e estratégias de intervenção</li>
<li>Avaliação psiquiátrica — avaliação inicial de perturbações da saúde mental e orientação</li>
<li>Saúde mental e desempenho — intervenção psicológica em contexto desportivo</li>
</ul>
<p><strong>Medicina desportiva e desempenho:</strong></p>
<ul>
<li>Avaliação médica de atletas — aptidão física, rastreio cardiovascular pré-desportivo</li>
<li>Medicina do futebol — avaliação e orientação específica para jogadores e equipas</li>
<li>Nutrição desportiva e suplementação — orientação baseada em evidências</li>
<li>Lesões desportivas — avaliação e orientação de lesões musculoesqueléticas</li>
<li>Exercício e saúde — integração de actividade física no acompanhamento de condições crónicas</li>
<li>Saúde mental do atleta — ansiedade de desempenho, burnout desportivo, recuperação psicológica</li>
</ul>
<p><strong>A sua abordagem:</strong> O Dr. Rúben Pereira combina rigor clínico, conhecimento científico e uma abordagem centrada no doente — com particular interesse na relação entre desempenho físico, bem-estar mental e saúde global. A sua formação em bioquímica permite-lhe compreender os mecanismos fisiopatológicos das doenças com uma profundidade que enriquece o raciocínio clínico. A sua experiência em urgência psiquiátrica confere-lhe a capacidade de avaliar situações de saúde mental com precisão e serenidade.</p>
<p><strong>Nota importante:</strong> Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, contacte a Linha de Apoio à Crise do SNS24 através do 1024 ou ligue ao 112 — não espere por uma consulta.</p>
`.trim(),
    qualifications: [
      "Médico de Clínica Geral — Divisão Geral, Ordem dos Médicos (OM 77228)",
      "Médico Interno de Formação Especializada em Psiquiatria — ULS Região de Leiria",
      "Mestrado Integrado em Medicina — Faculdade de Medicina, Universidade de Lisboa (FMUL)",
      "Pós-Graduação em Medicina Desportiva — Faculdade de Medicina, Universidade do Porto (FMUP)",
      "Mestrado em Oncologia — ICBAS, Universidade do Porto",
      "Licenciatura em Bioquímica — Universidade de Aveiro",
      "Diploma FIFA em Medicina do Futebol",
      "Publicações indexadas na PubMed",
      "Medicina de Urgência — ULS Gaia e Espinho · ULS Aveiro",
    ],
    faqs: [
      {
        question: "O Dr. Rúben Pereira está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. Rúben Pereira está registado na Ordem dos Médicos (OM) com o número 77228, na Divisão Geral. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Rúben formou-se em Medicina pela FMUL, tem Pós-Graduação em Medicina Desportiva pela FMUP, Mestrado em Oncologia pelo ICBAS e exerce actualmente como Interno de Formação Especializada em Psiquiatria na ULS Leiria.",
      },
      {
        question: "O que oferece o Dr. Rúben Pereira em consulta online?",
        answer:
          "O Dr. Rúben oferece três vertentes integradas em consulta online. Clínica geral: doença aguda, doenças crónicas, urgência, saúde preventiva, atestados e renovação de receitas. Saúde mental: ansiedade, depressão, insónia, stress e burnout, avaliação psiquiátrica e saúde mental em contexto desportivo. Medicina desportiva: avaliação de atletas, medicina do futebol (Diploma FIFA), nutrição desportiva, lesões desportivas, exercício e saúde, e saúde mental do atleta.",
      },
      {
        question: "O Dr. Rúben é interno de psiquiatria — que valência traz isso para a consulta online de clínica geral?",
        answer:
          "A formação especializada em psiquiatria em contexto hospitalar activo traz à consulta de clínica geral algo que poucos médicos têm: a capacidade de avaliar sintomas de saúde mental com a precisão de um especialista — distinguindo ansiedade de causa orgânica de ansiedade primária, reconhecendo quadros depressivos atípicos, avaliando o peso psiquiátrico de sintomas físicos. Para doentes com problemas de saúde mental — ou para doentes com doenças crónicas que também têm uma dimensão psicológica significativa — ter acesso a um médico de clínica geral com formação psiquiátrica activa é uma vantagem real e concreta.",
      },
      {
        question: "O que é o Diploma FIFA em Medicina do Futebol e para quem é relevante?",
        answer:
          "O Diploma FIFA em Medicina do Futebol é a certificação de referência internacional para médicos que trabalham em contexto de futebol e desporto de alto rendimento — desenvolvida pela FIFA em parceria com a F-MARC (FIFA Medical Assessment and Research Centre). Cobre avaliação médica de atletas, gestão de lesões no futebol, nutrição desportiva, suplementação e saúde mental do atleta. Para jogadores de futebol, atletas de outras modalidades ou praticantes de desporto regular que procuram acompanhamento médico especializado que integre desempenho físico e saúde — o Dr. Rúben é uma das opções mais qualificadas disponíveis online em Portugal.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Rúben Pereira?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Rúben Pereira. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112 — não espere por uma consulta.",
      },
      {
        question: "Quais são as qualificações do Dr. Rúben Pereira?",
        answer:
          "O Dr. Rúben Pereira tem Mestrado Integrado em Medicina pela FMUL, Pós-Graduação em Medicina Desportiva pela FMUP, Mestrado em Oncologia pelo ICBAS e Licenciatura em Bioquímica pela Universidade de Aveiro. Detém o Diploma FIFA em Medicina do Futebol e tem publicações indexadas na PubMed. Exerce actualmente como Interno de Formação Especializada em Psiquiatria na ULS Leiria, tendo exercido funções em Serviços de Urgência na ULS Gaia e Espinho e na ULS Aveiro. Registado na OM (nº 77228, Divisão Geral).",
      },
    ],
  },

  // ── 14. Dr. Rui Diogo Rodrigues (Médico de Clínica Geral e Medicina Familiar) ──
  {
    dbSlug: "dr-rui-diogo-rodrigues",
    title: "Médico de Clínica Geral e Medicina Familiar",
    seoTitle: "Dr. Rui Diogo Rodrigues — Medicina Geral e Familiar | OM 74473 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Rui Diogo Rodrigues — médico registado na OM (nº 74473). Nova Medical School Lisboa · Telemedicina · IA na saúde · Mestrado Transformação Digital · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Rui Diogo Rodrigues é médico de Medicina Geral e Familiar com consultório em Lisboa, com vasta experiência em telemedicina e uma perspectiva particularmente actual sobre a intersecção entre medicina clínica e transformação digital da saúde — um profissional que está simultaneamente na linha da frente da prática clínica e na vanguarda da inovação em saúde digital.</p>
<p>Formou-se com Mestrado em Medicina pela Nova Medical School, em Lisboa — uma das escolas médicas mais inovadoras em Portugal — com estágios clínicos em Medicina Interna, Cirurgia, Pediatria, Atenção Primária e Saúde Pública. Participou num programa Erasmus na Universidade Palacký em Olomouc, na República Checa, adquirindo experiência clínica internacional que enriqueceu a sua perspectiva sobre diferentes sistemas de saúde europeus.</p>
<p>A sua experiência em telemedicina é sólida e antecede a popularização da teleconsulta: trabalhou com serviços nacionais de telessaúde durante a pandemia de COVID-19, realizando triagem remota e orientação clínica — um contexto que exigiu decisão rápida e precisa em condições de elevada incerteza clínica. Continua a oferecer teleconsultas como parte integrante da sua prática clínica actual.</p>
<p>O seu envolvimento na transformação digital da saúde vai além da prática clínica: está actualmente a concluir um Mestrado em Gestão da Transformação Digital no Sector da Saúde e contribui activamente para workshops e conferências internacionais sobre a aplicação da inteligência artificial na atenção primária e no ensino médico. O seu trabalho nesta área foi reconhecido com prémios médicos nacionais e menções honrosas — uma distinção incomum para um clínico de MGF.</p>
<p>Para doentes que valorizam um médico que alia sólida formação clínica com uma compreensão real das ferramentas e plataformas digitais de saúde — e que sabe como tirar partido delas para melhorar o cuidado ao doente — o Dr. Rui Diogo Rodrigues representa uma opção contemporânea e diferenciadora.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, dor de garganta, infecções do ouvido</li>
<li>Infecções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, tiróide, colesterol elevado, asma, DPOC</li>
<li>Medicina preventiva — rastreios, vacinação, avaliações de saúde, aconselhamento sobre estilo de vida</li>
<li>Saúde pediátrica — consultas a crianças e adolescentes</li>
<li>Saúde pública — educação em saúde e literacia em saúde digital</li>
<li>Saúde mental — ansiedade, depressão, stress e referenciação a especialistas</li>
<li>Medicina digital — orientação sobre aplicações de saúde, monitorização remota e ferramentas digitais</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
<li>Referenciação para especialistas e meios complementares de diagnóstico</li>
</ul>
<p><strong>A sua abordagem:</strong> O Dr. Rui Diogo Rodrigues combina medicina baseada em evidências com ferramentas digitais inovadoras — não como substituto da relação médico-doente, mas como forma de a tornar mais acessível, mais informada e mais contínua. É reconhecido pelas suas excelentes competências de comunicação e pelo compromisso com uma medicina centrada no doente que acompanha a evolução da saúde digital.</p>
`.trim(),
    qualifications: [
      "Médico de Clínica Geral e Medicina Familiar — Ordem dos Médicos (OM 74473, Divisão Geral)",
      "Mestrado em Medicina — Nova Medical School, Lisboa",
      "Programa Erasmus — Universidade Palacký, Olomouc, República Checa",
      "Mestrado em Gestão da Transformação Digital no Sector da Saúde (em curso)",
      "Experiência em telemedicina — triagem e orientação clínica durante a pandemia de COVID-19",
      "Contribuições em workshops e conferências internacionais — IA na atenção primária e ensino médico",
      "Prémios médicos nacionais e menções honrosas",
    ],
    faqs: [
      {
        question: "O Dr. Rui Diogo Rodrigues está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. Rui Diogo Rodrigues está registado na Ordem dos Médicos (OM) com o número 74473, na Divisão Geral. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Rui formou-se em Medicina pela Nova Medical School, Lisboa, e tem vasta experiência em telemedicina e medicina geral e familiar com consultório em Lisboa.",
      },
      {
        question: "O que trata o Dr. Rui Diogo Rodrigues em consulta online?",
        answer:
          "O Dr. Rui oferece consultas de medicina geral e familiar online para: doença aguda (infecções respiratórias, febre, gripe, infecções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol, asma, DPOC), medicina preventiva, saúde pediátrica, saúde mental (ansiedade, depressão, stress), medicina digital (orientação sobre ferramentas e aplicações de saúde), atestados, renovação de receitas e referenciação a especialistas.",
      },
      {
        question: "O que distingue o Dr. Rui na sua abordagem à telemedicina e à saúde digital?",
        answer:
          "O Dr. Rui tem uma relação com a telemedicina que antecede a sua popularização: trabalhou com serviços nacionais de telessaúde durante a pandemia de COVID-19 — um contexto de elevada exigência que exigiu precisão diagnóstica remota em condições de incerteza clínica real. Actualmente está a concluir um Mestrado em Gestão da Transformação Digital no Sector da Saúde e contribui para conferências internacionais sobre IA na atenção primária — área em que recebeu prémios médicos nacionais. Para doentes que valorizam um médico que entende realmente as ferramentas digitais de saúde — não apenas as usa — o Dr. Rui oferece uma perspectiva única.",
      },
      {
        question: "O que é a aplicação de inteligência artificial na atenção primária e porque é relevante para o doente?",
        answer:
          "A inteligência artificial na atenção primária refere-se ao uso de ferramentas de IA para apoiar decisões clínicas, triagem de sintomas, análise de dados de saúde e personalização de cuidados. O Dr. Rui é um dos médicos de medicina geral em Portugal com envolvimento activo nesta área — contribuindo para conferências internacionais e formação médica sobre o tema. Para o doente, isto traduz-se num médico que está na fronteira do que a medicina digital pode oferecer hoje: sabe o que estas ferramentas podem e não podem fazer, e como utilizá-las de forma responsável ao serviço do cuidado clínico.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Rui Diogo Rodrigues?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Rui Diogo Rodrigues. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações do Dr. Rui Diogo Rodrigues?",
        answer:
          "O Dr. Rui Diogo Rodrigues tem Mestrado em Medicina pela Nova Medical School, Lisboa, com estágios em Medicina Interna, Cirurgia, Pediatria, Atenção Primária e Saúde Pública. Participou num programa Erasmus na Universidade Palacký em Olomouc, República Checa. Tem vasta experiência em telemedicina, incluindo triagem remota durante a pandemia de COVID-19. Está actualmente a concluir um Mestrado em Gestão da Transformação Digital no Sector da Saúde e contribui para conferências internacionais sobre IA na atenção primária, área em que recebeu prémios médicos nacionais. Registado na OM (nº 74473, Divisão Geral).",
      },
    ],
  },

  // ── 15. Dr. Telmo Coelho (Psiquiatra) ─────────────────────────────────────
  {
    dbSlug: "dr-telmo-coelho",
    title: "Psiquiatra",
    seoTitle: "Dr. Telmo Coelho — Psiquiatra | OM 48028 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Telmo Coelho — psiquiatra registado na OM (nº 48028). CH São João · Director Psiquiatria Hospital das Forças Armadas · Psiquiatria Forense · Psicotraumatologia · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Telmo Coelho é médico especialista em Psiquiatria com uma carreira de múltiplas décadas em contextos clínicos de elevada exigência — hospitalar, comunitário, forense, militar e institucional — que o posicionam como um dos psiquiatras com maior abrangência de experiência clínica especializada disponíveis para consulta online em Portugal.</p>
<p>Concluiu a especialização em Psiquiatria no Centro Hospitalar de São João, com distinção — o principal centro de psiquiatria académica e clínica no Norte de Portugal. A sua formação incluiu cuidados de internamento, hospital de dia, psiquiatria comunitária, psiquiatria de ligação, psiquiatria da infância e adolescência, comportamentos aditivos e neurologia.</p>
<p>Exerceu como Consultor Hospitalar em Psiquiatria no Hospital das Forças Armadas — Unidade do Porto, onde também dirigiu o Departamento de Psiquiatria — cargo de elevada responsabilidade clínica e de gestão. Desenvolve actividade clínica em consultas externas, serviços de urgência e psiquiatria de ligação, e tem experiência especializada no apoio psiquiátrico às Juntas Médicas das Forças Armadas e à Rede Nacional de Stresse de Guerra — uma das vertentes mais especializadas da psiquiatria em contexto militar e de trauma.</p>
<p>A sua experiência em psiquiatria forense é extensa: actuou como perito para o Serviço de Avaliação de Incapacidade da Segurança Social, colaborou com tribunais e instituições correcionais, realizou avaliações médico-legais e emitiu relatórios clínicos especializados para fins legais e administrativos. Colaborou igualmente com estabelecimentos prisionais e instituições sociais, com especial envolvimento no apoio psiquiátrico a populações vulneráveis.</p>
<p>No plano académico, foi Professor Convidado na Universidade Católica do Porto na área de Patologia Mental do Adulto e do Idoso. A sua formação de pós-graduação abrange Psicoterapia Psicodinâmica, Psiquiatria Forense, Psicotraumatologia, Medicina Militar e de Desastres, e inclui formação em electroconvulsivoterapia e medicina de emergência.</p>
<p>Para um doente com uma condição psiquiátrica complexa — ou para alguém que necessita de uma avaliação psiquiátrica especializada para fins clínicos, legais ou administrativos — a amplitude e profundidade da experiência do Dr. Telmo Coelho representam um nível de competência raramente acessível em consulta online.</p>
<p><strong>O que oferece online:</strong></p>
<ul>
<li>Avaliação psiquiátrica — diagnóstico e avaliação de perturbações da saúde mental</li>
<li>Depressão — avaliação, diagnóstico, orientação farmacológica e seguimento</li>
<li>Ansiedade e perturbações de ansiedade — ansiedade generalizada, pânico, TOC, fobia social</li>
<li>Perturbações do humor — depressão, perturbação bipolar, ciclotimia</li>
<li>Perturbações psicóticas — avaliação, diagnóstico e orientação terapêutica</li>
<li>Trauma e PTSD — avaliação e abordagem psicotraumatológica</li>
<li>Stresse de guerra e trauma militar — avaliação e acompanhamento especializado</li>
<li>Comportamentos aditivos — avaliação e orientação</li>
<li>Psiquiatria da infância e adolescência — avaliação e orientação</li>
<li>Psiquiatria do idoso — Patologia Mental do Adulto e do Idoso</li>
<li>Perturbações do sono — insónia, hipersónia, perturbações do ritmo circadiano</li>
<li>Relatórios clínicos psiquiátricos — para fins legais, administrativos, de incapacidade ou outros</li>
<li>Avaliações médico-legais — em contexto de incapacidade, seguros, tribunais ou processos administrativos</li>
<li>Segunda opinião psiquiátrica — sobre diagnósticos, planos de tratamento ou medicação</li>
<li>Gestão de medicação psiquiátrica — revisão, optimização e acompanhamento farmacológico</li>
</ul>
<p><strong>Nota importante:</strong> Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, contacte a Linha de Apoio à Crise do SNS24 através do 1024 ou ligue ao 112 — não espere por uma consulta.</p>
<p><strong>A sua abordagem:</strong> O Dr. Telmo Coelho alia rigor científico, ética profissional e um foco genuíno no bem-estar global do doente. A sua experiência em contextos tão distintos — da psiquiatria militar à psiquiatria forense, da urgência psiquiátrica ao acompanhamento de populações vulneráveis — confere-lhe uma capacidade de avaliação clínica que acomoda a complexidade real das situações que os doentes atravessam, sem a reduzi-las a categorias diagnósticas simplificadas.</p>
`.trim(),
    qualifications: [
      "Psiquiatra — Divisão de Especialista, Ordem dos Médicos (OM 48028)",
      "Especialização em Psiquiatria com distinção — Centro Hospitalar de São João, Porto",
      "Consultor Hospitalar em Psiquiatria — Hospital das Forças Armadas, Unidade do Porto",
      "Director do Departamento de Psiquiatria — Hospital das Forças Armadas, Porto",
      "Apoio psiquiátrico às Juntas Médicas das Forças Armadas",
      "Rede Nacional de Stresse de Guerra",
      "Perito em Psiquiatria Forense — Segurança Social, tribunais e instituições correcionais",
      "Professor Convidado — Universidade Católica do Porto · Patologia Mental do Adulto e do Idoso",
      "Pós-graduação em Psicoterapia Psicodinâmica",
      "Pós-graduação em Psiquiatria Forense",
      "Pós-graduação em Psicotraumatologia",
      "Pós-graduação em Medicina Militar e de Desastres",
      "Formação em Electroconvulsivoterapia",
      "Experiência em estabelecimentos prisionais e apoio a populações vulneráveis",
    ],
    faqs: [
      {
        question: "O Dr. Telmo Coelho está registado na Ordem dos Médicos com especialidade em Psiquiatria?",
        answer:
          "Sim. O Dr. Telmo Coelho está registado na Ordem dos Médicos (OM) com o número 48028, na Divisão de Especialista. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Telmo concluiu a especialização em Psiquiatria com distinção no Centro Hospitalar de São João e foi Director do Departamento de Psiquiatria no Hospital das Forças Armadas do Porto.",
      },
      {
        question: "O que oferece o Dr. Telmo Coelho em consulta online?",
        answer:
          "O Dr. Telmo oferece consultas psiquiátricas online para: avaliação e diagnóstico psiquiátrico, depressão, ansiedade e perturbações de ansiedade, perturbações do humor (depressão, bipolar), perturbações psicóticas, trauma e PTSD, stresse de guerra e trauma militar, comportamentos aditivos, psiquiatria da infância e adolescência, psiquiatria do idoso, perturbações do sono, relatórios clínicos psiquiátricos para fins legais ou administrativos, avaliações médico-legais, segunda opinião psiquiátrica e gestão de medicação psiquiátrica.",
      },
      {
        question: "O Dr. Coelho tem experiência específica em trauma, PTSD e stresse de guerra?",
        answer:
          "Sim. O Dr. Telmo tem pós-graduação em Psicotraumatologia e experiência clínica especializada em trauma e PTSD, incluindo acompanhamento de militares e ex-combatentes através da Rede Nacional de Stresse de Guerra e das Juntas Médicas das Forças Armadas. Esta é uma das suas áreas de maior especialização — com formação académica avançada e prática clínica real em contextos onde o trauma é a apresentação principal. Para doentes com PTSD, trauma complexo ou stresse pós-traumático — seja de origem militar, civil ou outra — o Dr. Telmo oferece uma das perspectivas mais especializadas disponíveis online em Portugal.",
      },
      {
        question: "O Dr. Coelho pode elaborar relatórios clínicos psiquiátricos para fins legais ou administrativos?",
        answer:
          "Sim. O Dr. Telmo Coelho tem vasta experiência em psiquiatria forense — actuou como perito para o Serviço de Avaliação de Incapacidade da Segurança Social, colaborou com tribunais e instituições correcionais, realizou avaliações médico-legais e emitiu relatórios clínicos especializados para fins legais e administrativos. Pode elaborar relatórios psiquiátricos para fins de incapacidade, processos legais, avaliações de seguros, processos administrativos e outros contextos que requeiram perícia psiquiátrica. Esta necessidade pode ser discutida e avaliada durante a consulta online.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Telmo Coelho?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Telmo Coelho. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. Se está a experienciar uma crise psiquiátrica ou pensamentos de autolesão, ligue 1411. Em caso de perigo imediato, ligue 112 — não espere por uma consulta.",
      },
      {
        question: "Quais são as qualificações do Dr. Telmo Coelho?",
        answer:
          "O Dr. Telmo Coelho é especialista em Psiquiatria, com especialização com distinção no Centro Hospitalar de São João. Foi Consultor Hospitalar e Director do Departamento de Psiquiatria no Hospital das Forças Armadas do Porto, com experiência nas Juntas Médicas das Forças Armadas e na Rede Nacional de Stresse de Guerra. É perito em psiquiatria forense para a Segurança Social, tribunais e instituições correcionais, e foi Professor Convidado na Universidade Católica do Porto. Tem pós-graduações em Psicoterapia Psicodinâmica, Psiquiatria Forense, Psicotraumatologia e Medicina Militar e de Desastres, e formação em electroconvulsivoterapia. Registado na OM (nº 48028, Divisão de Especialista).",
      },
    ],
  },

  // ── 16. Dr. Vítor Pais (Médico de Medicina Geral e Familiar; DB slug uses full name) ──
  {
    dbSlug: "dr-vitor-hugo-de-matos-pais",
    title: "Médico de Medicina Geral e Familiar",
    seoTitle: "Dr. Vítor Pais — Medicina Geral e Familiar | OM 64505 | Global Health Portugal",
    seoDescription:
      "Agende uma videoconsulta com Dr. Vítor Pais — médico de medicina geral e familiar registado na OM (nº 64505). ULS Cova da Beira, Guarda e Castelo Branco · Medicina preventiva · Tabagismo · Português e inglês. Consulta no mesmo dia.",
    bio: `
<p>O Dr. Vítor Hugo de Matos Pais é médico especialista em Medicina Geral e Familiar com vasta experiência clínica em cuidados primários, medicina de emergência, telemedicina e cuidados de saúde comunitários em Portugal — um médico de família com uma formação académica mais abrangente do que o habitual, que reflecte um interesse profundo tanto na medicina preventiva como nos determinantes ambientais e sociais da saúde.</p>
<p>Concluiu o Mestrado Integrado em Medicina pela Universidade da Beira Interior e aprofundou a sua formação com uma Pós-Graduação em Medicina Social pela Universidade Católica Portuguesa — que lhe confere uma perspectiva sobre os factores sociais, económicos e comunitários que influenciam a saúde — e uma Pós-Graduação em Climatologia e Hidrologia pela Faculdade de Medicina da Universidade do Porto, área que estuda o impacto das condições climáticas e ambientais na saúde humana. Possui ainda formação certificada em Suporte Avançado de Vida e em Tratamento e Prevenção do Tabagismo.</p>
<p>Exerce actualmente como especialista em Medicina Geral e Familiar em diversas unidades de saúde da região Centro: ULS Cova da Beira, ULS Guarda e ULS Castelo Branco, com actividade complementar em clínicas privadas. A sua experiência profissional abrange serviços de urgência hospitalar, consultas de cuidados primários, telemedicina e visitas médicas domiciliárias — o que lhe permite gerir uma gama alargada de doenças agudas e crónicas em contextos muito diversificados.</p>
<p>O seu interesse particular na medicina preventiva e na educação do doente traduz-se numa abordagem centrada não apenas no tratamento da doença, mas na promoção activa da saúde e do bem-estar a longo prazo — com especial atenção ao tabagismo, aos estilos de vida e aos determinantes sociais e ambientais da saúde que poucos médicos de família abordam com a mesma profundidade.</p>
<p><strong>O que trata:</strong></p>
<ul>
<li>Doença aguda — infecções respiratórias, febre, gripe, dor de garganta, infecções do ouvido</li>
<li>Infecções urinárias e saúde sexual</li>
<li>Gestão de doenças crónicas — hipertensão, diabetes, tiróide, colesterol elevado, asma, DPOC</li>
<li>Medicina preventiva — rastreios, vacinação, avaliações de saúde, aconselhamento sobre estilo de vida</li>
<li>Cessação tabágica — avaliação e tratamento da dependência do tabaco, estratégias de cessação</li>
<li>Saúde ambiental — impacto das condições climáticas e ambientais na saúde, aconselhamento preventivo</li>
<li>Medicina social — abordagem dos determinantes sociais de saúde, literacia em saúde</li>
<li>Saúde da família — cuidados a todas as idades, desde crianças a idosos</li>
<li>Saúde mental — ansiedade, depressão, stress e referenciação a especialistas</li>
<li>Acompanhamento domiciliar — orientação e monitorização remota para doentes com mobilidade reduzida</li>
<li>Atestados médicos, declarações e renovação de receitas</li>
<li>Referenciação para especialistas e meios complementares de diagnóstico</li>
</ul>
<p><strong>A sua abordagem:</strong> O Dr. Vítor Pais é reconhecido pelas suas excelentes competências de comunicação e pela abordagem centrada no doente — priorizando o cuidado integral baseado em evidências, a continuidade do tratamento e a promoção da saúde e do bem-estar a longo prazo. A sua formação em medicina social e saúde ambiental enriquece a consulta com uma perspectiva que vai além do sintoma individual: o Dr. Vítor olha para o contexto de vida do doente — onde vive, como vive, o que respira — como parte integrante do diagnóstico clínico.</p>
`.trim(),
    qualifications: [
      "Médico de Medicina Geral e Familiar — Ordem dos Médicos (OM 64505, Divisão Geral)",
      "Mestrado Integrado em Medicina — Universidade da Beira Interior",
      "Pós-Graduação em Medicina Social — Universidade Católica Portuguesa",
      "Pós-Graduação em Climatologia e Hidrologia — Faculdade de Medicina, Universidade do Porto",
      "Certificação em Suporte Avançado de Vida",
      "Certificação em Tratamento e Prevenção do Tabagismo",
      "Especialista MGF — ULS Cova da Beira · ULS Guarda · ULS Castelo Branco",
      "Experiência em urgência hospitalar, telemedicina e visitas domiciliárias",
    ],
    faqs: [
      {
        question: "O Dr. Vítor Pais está registado na Ordem dos Médicos?",
        answer:
          "Sim. O Dr. Vítor Hugo de Matos Pais está registado na Ordem dos Médicos (OM) com o número 64505, na Divisão Geral. Pode verificar este registo em ordemdosmedicos.pt. O Dr. Vítor é especialista em Medicina Geral e Familiar, formado pela Universidade da Beira Interior, e exerce actualmente na ULS Cova da Beira, ULS Guarda e ULS Castelo Branco.",
      },
      {
        question: "O que trata o Dr. Vítor Pais em consulta online?",
        answer:
          "O Dr. Vítor oferece consultas de medicina geral e familiar online para: doença aguda (infecções respiratórias, febre, gripe, infecções urinárias), gestão de doenças crónicas (hipertensão, diabetes, tiróide, colesterol, asma, DPOC), medicina preventiva, cessação tabágica, saúde ambiental, medicina social, saúde da família (todas as idades), saúde mental (ansiedade, depressão), acompanhamento domiciliar, atestados, renovação de receitas e referenciação a especialistas.",
      },
      {
        question: "O Dr. Vítor tem formação específica em cessação tabágica?",
        answer:
          "Sim. O Dr. Vítor Pais tem certificação específica em Tratamento e Prevenção do Tabagismo — uma formação especializada que vai além do conselho geral de \"deixe de fumar\". A cessação tabágica eficaz é um processo clínico que combina avaliação da dependência nicotínica, estratégias farmacológicas (vareniclina, bupropiona, TSN) e intervenção comportamental. Para doentes que querem deixar de fumar com acompanhamento médico estruturado — incluindo prescrição de medicação de apoio quando indicada — o Dr. Vítor oferece uma abordagem clínica baseada em evidências.",
      },
      {
        question: "O que é a Pós-Graduação em Climatologia e Hidrologia e porque é relevante para a medicina?",
        answer:
          "A Climatologia e Hidrologia médica estuda o impacto das condições climáticas, da qualidade do ar, da água e do ambiente natural na saúde humana — uma área com relevância crescente face às alterações climáticas e ao seu impacto na saúde respiratória, cardiovascular e mental. Para doentes com asma, DPOC, rinite alérgica, doenças cardiovasculares ou condições em que o ambiente tem um papel significativo — ou para pessoas que procuram orientação sobre os efeitos do clima na sua saúde — o Dr. Vítor oferece uma perspectiva clínica especializada que poucos médicos de família têm.",
      },
      {
        question: "Como agendar uma consulta com o Dr. Vítor Pais?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com o Dr. Vítor Pais. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português ou inglês. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações do Dr. Vítor Pais?",
        answer:
          "O Dr. Vítor Hugo de Matos Pais tem Mestrado Integrado em Medicina pela Universidade da Beira Interior, Pós-Graduação em Medicina Social pela Universidade Católica Portuguesa e Pós-Graduação em Climatologia e Hidrologia pela Faculdade de Medicina da Universidade do Porto. Tem certificações em Suporte Avançado de Vida e Tratamento e Prevenção do Tabagismo. Exerce como especialista em MGF na ULS Cova da Beira, ULS Guarda e ULS Castelo Branco, com experiência em urgência hospitalar, telemedicina e visitas domiciliárias. Registado na OM (nº 64505, Divisão Geral).",
      },
    ],
  },

  // ── 17. Sónia Xavier (Nutricionista Clínica — no "Dr./Dra." prefix; DB slug uses full name; wrong registry link fix) ──
  {
    dbSlug: "sonia-oliveira-xavier",
    title: "Nutricionista Clínica",
    seoTitle: "Sónia Xavier — Nutricionista Clínica | ON 0020N | Global Health Portugal",
    seoDescription:
      "Agende uma consulta com Sónia Xavier — Nutricionista Clínica registada na ON (nº 0020N). 20+ anos experiência · Hospital Nélio Mendonça · Oncologia · Doença Renal · Perturbações Alimentares · Português, inglês e espanhol.",
    medicalRegistrationUrlFix: "https://www.ordemdosnutricionistas.pt",
    bio: `
<p>Sónia Xavier é Nutricionista Clínica com mais de duas décadas de experiência clínica especializada — uma das nutricionistas com maior profundidade de formação em nutrição oncológica, doença renal, perturbações alimentares e cuidados paliativos disponíveis para consulta online em Portugal.</p>
<p>Licenciou-se em Nutrição e Ciências da Alimentação pela Universidade do Porto em 2000 e obteve a Especialização em Nutrição Clínica reconhecida pela Ordem dos Nutricionistas em 2021 — uma distinção que atesta a profundidade da sua prática e formação clínicas. Ao longo da sua carreira, aprofundou a sua especialização com pós-graduações em Oncologia pela Liga Portuguesa Contra o Cancro, em Perturbações Alimentares e em Cuidados Paliativos, e detém um Certificado de Aptidão Profissional como formadora.</p>
<p>Com mais de vinte anos no Serviço de Saúde da Região Autónoma da Madeira, destacou-se como Assessora Técnica Sénior em Nutrição e Coordenadora de Nutrição e Serviços de Alimentação — liderando equipas, concebendo menus clínicos e promovendo cuidados nutricionais personalizados em entidades públicas e privadas.</p>
<p>Actualmente, presta consultas clínicas no Hospital Nélio Mendonça, no Serviço de Nefrologia — onde acompanha doentes com doença renal crónica, um dos contextos nutricionais mais exigentes e específicos da prática clínica — e em centros de referência privados como a Clínica da Sé em Funchal e o Hospital da Luz – Clínica do Caniço. Coordena também o serviço de alimentação da Santa Casa da Misericórdia de Machico e presta apoio nutricional à Fundação Mário Miguel.</p>
<p>No plano associativo, foi membro do Conselho Geral da Ordem dos Nutricionistas entre 2019 e 2022, e integra a Sociedade Portuguesa para o Estudo da Obesidade (SPEO), a Associação Portuguesa de Nutricionistas (APN) e a Sociedade Portuguesa de Medicina do Estilo de Vida (SPMEV) — o que reflecte um envolvimento activo na evolução da nutrição clínica como disciplina científica em Portugal.</p>
<p><strong>O que oferece online:</strong></p>
<ul>
<li>Nutrição clínica geral — avaliação nutricional, plano alimentar personalizado e acompanhamento</li>
<li>Nutrição oncológica — apoio nutricional durante e após o tratamento do cancro (quimioterapia, radioterapia, cirurgia)</li>
<li>Nutrição na doença renal crónica — planos alimentares específicos para insuficiência renal, hemodiálise e diálise peritoneal</li>
<li>Perturbações alimentares — anorexia nervosa, bulimia, alimentação compulsiva, ortorexia — avaliação e intervenção nutricional</li>
<li>Obesidade e gestão do peso — abordagem clínica baseada em evidências, integrada com o contexto médico do doente</li>
<li>Cuidados paliativos — apoio nutricional em doença avançada, gestão de sintomas nutricionais, qualidade de vida</li>
<li>Diabetes e síndrome metabólica — nutrição no controlo glicémico e da resistência à insulina</li>
<li>Nutrição cardiovascular — dislipidemia, hipertensão e prevenção cardiovascular por via nutricional</li>
<li>Nutrição no idoso — sarcopenia, desnutrição, disfagia e nutrição específica para a terceira idade</li>
<li>Nutrição pediátrica — orientação alimentar em crianças e adolescentes</li>
<li>Medicina do estilo de vida — integração da nutrição com actividade física, sono e bem-estar geral</li>
<li>Educação nutricional — literacia alimentar e capacitação do doente para escolhas informadas</li>
</ul>
<p><strong>A sua abordagem:</strong> Sónia Xavier oferece uma abordagem clínica rigorosa, empática e abrangente — centrada no equilíbrio nutricional de doentes com perfis muito distintos e frequentemente complexos. A sua experiência simultânea em oncologia, doença renal, perturbações alimentares e cuidados paliativos confere-lhe a capacidade de trabalhar com doentes nos momentos mais difíceis da vida, onde a nutrição não é um acessório — é cuidado clínico real.</p>
`.trim(),
    qualifications: [
      "Especialização em Nutrição Clínica — Ordem dos Nutricionistas (ON 0020N, 2021)",
      "Licenciatura em Nutrição e Ciências da Alimentação — Universidade do Porto (2000)",
      "Pós-Graduação em Oncologia — Liga Portuguesa Contra o Cancro",
      "Pós-Graduação em Perturbações Alimentares",
      "Pós-Graduação em Cuidados Paliativos",
      "Certificado de Aptidão Profissional — Formadora",
      "Nutricionista Clínica — Hospital Nélio Mendonça, Serviço de Nefrologia, Madeira",
      "Nutricionista Clínica — Clínica da Sé, Funchal · Hospital da Luz – Clínica do Caniço",
      "Assessora Técnica Sénior em Nutrição — Serviço de Saúde da RAM",
      "Coordenadora de Nutrição e Serviços de Alimentação — 20+ anos",
      "Membro do Conselho Geral — Ordem dos Nutricionistas (2019–2022)",
      "Membro — SPEO (Sociedade Portuguesa para o Estudo da Obesidade)",
      "Membro — APN (Associação Portuguesa de Nutricionistas)",
      "Membro — SPMEV (Sociedade Portuguesa de Medicina do Estilo de Vida)",
      "Membro — Liga Portuguesa Contra o Cancro",
    ],
    faqs: [
      {
        question: "A Sónia Xavier está registada na Ordem dos Nutricionistas com Especialização em Nutrição Clínica?",
        answer:
          "Sim. Sónia Xavier está registada na Ordem dos Nutricionistas (ON) com o número 0020N e detém a Especialização em Nutrição Clínica reconhecida pela ON desde 2021. Pode verificar este registo em ordemdosnutricionistas.pt. Sónia tem mais de vinte anos de experiência clínica em nutrição, incluindo prática actual no Hospital Nélio Mendonça (Serviço de Nefrologia), na Clínica da Sé em Funchal e no Hospital da Luz – Clínica do Caniço.",
      },
      {
        question: "Com o que pode ajudar a Sónia Xavier em consulta online?",
        answer:
          "A Sónia oferece consultas de nutrição clínica online para: nutrição geral (avaliação e plano alimentar personalizado), nutrição oncológica (apoio durante e após tratamento do cancro), doença renal crónica (planos específicos para insuficiência renal, hemodiálise e diálise), perturbações alimentares (anorexia, bulimia, alimentação compulsiva, ortorexia), obesidade e gestão do peso, cuidados paliativos, diabetes e síndrome metabólica, nutrição cardiovascular, nutrição no idoso, nutrição pediátrica e medicina do estilo de vida.",
      },
      {
        question: "A Sónia tem experiência específica em nutrição oncológica?",
        answer:
          "Sim. A Sónia tem pós-graduação específica em Oncologia pela Liga Portuguesa Contra o Cancro — da qual é membro — e experiência clínica em apoio nutricional a doentes oncológicos. A nutrição em oncologia é uma área de elevada complexidade: durante e após a quimioterapia, radioterapia ou cirurgia oncológica, as necessidades nutricionais do doente mudam significativamente — surgem dificuldades em comer, náuseas, alterações de peso, risco de desnutrição — e a intervenção nutricional especializada faz uma diferença real na tolerância ao tratamento, na qualidade de vida e na recuperação. A Sónia oferece acompanhamento nutricional individualizado adaptado a cada fase do percurso oncológico.",
      },
      {
        question: "A Sónia tem experiência em nutrição na doença renal crónica?",
        answer:
          "Sim. A Sónia exerce actualmente no Serviço de Nefrologia do Hospital Nélio Mendonça na Madeira — um dos contextos de nutrição clínica mais exigentes e específicos, onde o controlo alimentar rigoroso é parte integrante do tratamento. A dieta na doença renal crónica, hemodiálise e diálise peritoneal requer uma gestão muito precisa de proteína, potássio, fósforo, sódio e líquidos — com implicações directas na progressão da doença e na qualidade de vida do doente. A Sónia tem experiência clínica diária neste contexto e pode apoiar doentes renais em qualquer fase da doença.",
      },
      {
        question: "Como agendar uma consulta com a Sónia Xavier?",
        answer:
          "Selecione um horário disponível nesta página para agendar directamente com Sónia Xavier. O pagamento é processado de forma segura no momento do agendamento — a consulta é confirmada após a conclusão do pagamento. Receberá imediatamente um convite para o calendário. As consultas são realizadas por videochamada segura em português, inglês ou espanhol. As consultas no mesmo dia estão geralmente disponíveis.",
      },
      {
        question: "Quais são as qualificações da Sónia Xavier?",
        answer:
          "Sónia Xavier é licenciada em Nutrição e Ciências da Alimentação pela Universidade do Porto (2000) e detém a Especialização em Nutrição Clínica pela Ordem dos Nutricionistas (ON 0020N, 2021). Tem pós-graduações em Oncologia (Liga Portuguesa Contra o Cancro), Perturbações Alimentares e Cuidados Paliativos. Com mais de vinte anos de experiência no Serviço de Saúde da RAM, exerce actualmente no Hospital Nélio Mendonça (Nefrologia), na Clínica da Sé Funchal e no Hospital da Luz – Clínica do Caniço. Foi membro do Conselho Geral da Ordem dos Nutricionistas (2019–2022) e é membro da SPEO, APN e SPMEV.",
      },
    ],
  },
];
