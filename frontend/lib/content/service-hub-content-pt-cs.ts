import type { ServiceHubContent } from "./service-hub-content";

type HubContext = {
  countryName: string;
  locale: string;
  serviceNames: string[];
};

function ptSpecialistContent(context: HubContext): ServiceHubContent {
  const commonReasons = context.serviceNames.length > 0
    ? {
        eyebrow: "Áreas disponíveis",
        title: "Motivos para escolher uma consulta de especialidade",
        intro: "Os serviços de especialidade ativos atualmente disponíveis neste país são:",
        items: context.serviceNames,
        note: "Selecione um serviço para conhecer o respetivo âmbito antes de marcar. Um profissional de saúde decide se uma consulta online é adequada para a questão apresentada.",
      }
    : undefined;

  return {
    resolvedLocale: "pt",
    overview: {
      eyebrow: "Visão geral",
      title: "Cuidados especializados associados a um serviço ativo",
      body: `A Global Health apresenta os serviços de consulta online de especialidade atualmente disponíveis em ${context.countryName}. A disponibilidade depende do serviço, do profissional de saúde e dos horários de consulta. Algumas situações exigem um exame presencial ou outro contexto de cuidados.`,
    },
    whoFor: {
      eyebrow: "A quem se pode destinar",
      title: "Quando pode considerar fazer uma marcação",
      intro: "Uma consulta de especialidade pode ser útil quando pretende falar sobre uma questão com um profissional de saúde que trabalhe numa área específica.",
      items: [
        "Foi-lhe recomendado procurar uma avaliação por um especialista",
        "Pretende falar sobre uma questão existente ou um acompanhamento planeado",
        "Procura uma segunda opinião clínica, quando adequado",
        "Pretende perceber se uma consulta online de especialidade é um próximo passo adequado",
      ],
    },
    commonReasons,
    process: {
      eyebrow: "Como funciona",
      title: "Da seleção do serviço ao acompanhamento",
      steps: [
        { title: "Selecione um serviço", body: "Consulte os serviços de especialidade ativos e as informações publicadas sobre cada um." },
        { title: "Escolha um médico elegível", body: "Apenas os profissionais de saúde atribuídos ao serviço selecionado estão disponíveis para marcação." },
        { title: "Escolha uma consulta", body: "Selecione um dos horários atualmente disponíveis para esse médico e serviço." },
        { title: "Conclua a marcação", body: "Introduza os dados necessários do paciente e efetue o pagamento, quando aplicável." },
        { title: "Participe online", body: "Utilize as informações da consulta fornecidas na confirmação da sua marcação." },
        { title: "Reveja os passos seguintes", body: "Qualquer acompanhamento, documentação, exames ou encaminhamentos dependem do critério clínico e do serviço prestado." },
      ],
    },
    whyChoose: {
      eyebrow: "Porquê a Global Health",
      title: "Informações claras antes de marcar",
      items: [
        "Disponibilidade de profissionais de saúde e serviços específica para cada país",
        "Perfis de médicos transparentes e idiomas indicados",
        "Dados de registo apresentados quando estão disponíveis informações verificadas",
        "Preços e duração da consulta apresentados quando configurados",
        "Marcação online segura e confirmação da consulta",
        "As ações de marcação com um médico incluem um serviço de especialidade válido que lhe está atribuído",
      ],
    },
    importantInformation: {
      eyebrow: "Informações importantes",
      title: "Os cuidados especializados online têm limitações",
      paragraphs: [
        "As consultas online não são adequadas para emergências. Contacte o serviço de emergência da sua localização se precisar de ajuda urgente.",
        "Alguns sintomas e problemas de saúde exigem exame físico, avaliação urgente ou exames presenciais. O profissional de saúde pode recomendar outro contexto de cuidados.",
        "Receitas, exames, encaminhamentos, declarações, tratamentos e outros documentos nunca são garantidos. Dependem do critério clínico e das regras locais aplicáveis.",
        `Os serviços, profissionais de saúde, preços e horários de consulta variam em ${context.countryName} e podem mudar à medida que o catálogo ativo é atualizado.`,
      ],
    },
    faq: [
      { question: "Como funciona uma consulta online de especialidade?", answer: "Selecione um serviço de especialidade ativo, escolha um profissional de saúde atribuído ao mesmo, selecione uma consulta disponível e conclua os passos da marcação. As informações da consulta são fornecidas após a marcação." },
      { question: "Preciso de encaminhamento?", answer: "Os requisitos de encaminhamento podem variar consoante o serviço e a situação clínica. Consulte as informações do serviço e forneça qualquer encaminhamento ou informação médica relevante solicitada durante a marcação." },
      { question: "Que áreas de especialidade estão disponíveis?", answer: "Os cartões de serviço nesta página correspondem aos serviços de especialidade ativos atualmente apresentados para o país selecionado. A disponibilidade pode mudar." },
      { question: "Como são selecionados os médicos apresentados nesta página?", answer: "Um médico é apresentado quando está ativo no país selecionado e tem uma atribuição ativa a, pelo menos, um dos serviços de especialidade aqui apresentados. As especialidades indicadas são utilizadas para descrição e não como regra de elegibilidade para marcação." },
      { question: "Quanto custa uma consulta e qual é a sua duração?", answer: "Quando configurado, cada cartão de serviço apresenta o preço inicial e a duração. Confirme o serviço, o médico e os detalhes da consulta selecionados antes do pagamento." },
      { question: "Uma consulta online é adequada para todas as situações?", answer: "Não. Um profissional de saúde pode recomendar uma avaliação urgente ou presencial quando a situação não puder ser tratada com segurança numa consulta online." },
    ],
    emptyState: {
      title: "Não existem médicos especialistas disponíveis para marcação",
      body: "Atualmente, não existem atribuições ativas entre médicos e serviços de especialidade neste país. Pode consultar o catálogo de serviços ou voltar a verificar mais tarde.",
    },
  };
}

function ptTestsContent(context: HubContext): ServiceHubContent {
  return {
    resolvedLocale: "pt",
    overview: {
      eyebrow: "Visão geral",
      title: "Testes de saúde com informações específicas do produto",
      body: `Esta página apresenta os testes de saúde atualmente disponíveis em ${context.countryName}. Cada teste tem o seu próprio preço, estado de stock, informações sobre a amostra e prazo previsto para os resultados, quando esses dados estão configurados.`,
    },
    whoFor: {
      eyebrow: "A quem se pode destinar",
      title: "Quando um teste de saúde pode ser útil",
      intro: "Um teste pode ajudar a obter informações sobre uma questão de saúde específica descrita na respetiva página de produto.",
      items: [
        "Pretende consultar os marcadores ou as áreas abrangidas por um teste disponível",
        "Foi-lhe recomendado realizar um teste específico",
        "Consegue seguir as instruções de recolha de amostra fornecidas para esse produto",
        "Compreende que o resultado de um teste não substitui uma avaliação clínica urgente ou abrangente",
      ],
    },
    process: {
      eyebrow: "Encomenda",
      title: "Como funciona a encomenda",
      steps: [
        { title: "Consulte um teste", body: "Abra a página do produto e verifique o que abrange, o tipo de amostra, o preço, o stock e qualquer prazo publicado." },
        { title: "Adicione-o ao carrinho", body: "Utilize a ação do produto apenas quando o teste estiver disponível e as informações corresponderem às suas necessidades." },
        { title: "Conclua o pagamento", body: "Confirme as informações da encomenda, os dados do paciente, o preço e quaisquer custos específicos do produto apresentados no pagamento." },
        { title: "Siga as instruções", body: "Utilize as instruções de recolha, devolução ou marcação fornecidas para o teste específico que encomendou." },
      ],
    },
    secondaryProcess: {
      eyebrow: "Recolha da amostra",
      title: "O processo depende do teste",
      steps: [
        { title: "Verifique o tipo de amostra", body: "O catálogo e a página do produto apresentam o tipo de amostra configurado, quando disponível." },
        { title: "Leia as instruções do produto", body: "Os requisitos de preparação, recolha e transporte podem variar; siga as instruções fornecidas para esse teste." },
        { title: "Utilize o método indicado", body: "As condições de entrega, recolha, deslocação à clínica ou devolução são específicas do produto e do país e devem ser confirmadas antes da encomenda." },
      ],
    },
    results: {
      eyebrow: "Resultados e passos seguintes",
      title: "Consulte o prazo e as informações de acompanhamento do seu teste",
      paragraphs: [
        "Quando existe um prazo de resultados configurado, este é apresentado no cartão e na página de detalhes do teste relevante. Trata-se de uma estimativa para esse produto, não de uma garantia para todas as encomendas.",
        "A forma de disponibilização dos resultados e a inclusão ou não de uma análise por um profissional de saúde devem estar indicadas para cada teste. Esta página não pressupõe que todos os testes incluam consulta ou análise clínica.",
        "Um resultado pode ter de ser interpretado em conjunto com sintomas, historial médico, exame físico ou outros testes. Procure aconselhamento clínico adequado se tiver dúvidas sobre o significado de um resultado.",
      ],
    },
    whyChoose: {
      eyebrow: "Porquê a Global Health",
      title: "Um catálogo de testes específico para cada país",
      items: [
        "Apenas são apresentados testes ativos para o país selecionado",
        "São apresentados o preço e a moeda atualmente configurados",
        "O estado de stock é respeitado antes de um artigo poder ser encomendado",
        "O tipo de amostra e o prazo dos resultados são apresentados quando disponíveis",
        "As páginas de produto podem fornecer informações específicas sobre o âmbito do teste e perguntas frequentes",
        "Carrinho e processo de pagamento seguros",
      ],
    },
    importantInformation: {
      eyebrow: "Limitações importantes",
      title: "Um teste não substitui cuidados de emergência nem cuidados clínicos completos",
      paragraphs: [
        "Não utilize uma encomenda de teste online quando precisar de uma avaliação de emergência. Contacte o serviço de emergência da sua localização se precisar de ajuda urgente.",
        "Os testes têm âmbitos e limitações definidos. Um resultado normal não exclui todas as condições, e um resultado anormal não estabelece, por si só, um diagnóstico.",
        "O método de recolha, a disponibilidade, o processamento, a entrega, o prazo dos resultados e o acompanhamento podem variar consoante o teste e o país. Consulte as informações fornecidas para o produto específico.",
        "Se os sintomas forem novos, graves, estiverem a piorar ou forem preocupantes, procure uma avaliação clínica adequada em vez de depender apenas do resultado de um teste.",
      ],
    },
    faq: [
      { question: "Que testes estão disponíveis no meu país?", answer: "Os cartões de produto nesta página correspondem aos testes de saúde ativos atualmente apresentados para o país selecionado. Se não forem apresentados cartões, não existe, neste momento, um catálogo ativo disponível para encomenda." },
      { question: "Que amostra terei de fornecer?", answer: "Os requisitos de amostra variam. Consulte o tipo de amostra e as instruções completas na página do teste antes de encomendar." },
      { question: "Quanto tempo demoram os resultados?", answer: "Quando disponível, o prazo previsto é apresentado para cada teste. O tempo de processamento pode variar e não deve ser considerado um serviço de emergência." },
      { question: "Como vou receber os resultados?", answer: "A disponibilização dos resultados é específica de cada teste. Siga as informações e instruções fornecidas para o produto e para a sua encomenda." },
      { question: "Todos os testes incluem análise por um profissional de saúde?", answer: "Não necessariamente. Uma análise ou consulta por um profissional de saúde só deve ser considerada incluída quando as informações do teste o indicarem explicitamente." },
      { question: "Um teste de saúde pode substituir uma consulta?", answer: "Nenhum teste isolado substitui a avaliação dos sintomas, do historial e de outras informações clínicas. Procure aconselhamento clínico adequado quando precisar de interpretação ou continuar preocupado." },
    ],
    emptyState: {
      title: "Atualmente, não existem testes de saúde disponíveis",
      body: `Neste momento, não existem produtos ativos de testes de saúde disponíveis para encomenda em ${context.countryName}.`,
    },
  };
}

function csSpecialistContent(context: HubContext): ServiceHubContent {
  const commonReasons = context.serviceNames.length > 0
    ? {
        eyebrow: "Dostupné obory",
        title: "Důvody pro konzultaci se specialistou",
        intro: "V této zemi jsou aktuálně uvedeny tyto aktivní služby specialistů:",
        items: context.serviceNames,
        note: "Před objednáním si u vybrané služby přečtěte, co zahrnuje. Zdravotník posoudí, zda je online konzultace pro projednávaný problém vhodná.",
      }
    : undefined;

  return {
    resolvedLocale: "cs",
    overview: {
      eyebrow: "Přehled",
      title: "Specializovaná péče propojená s aktivní službou",
      body: `Global Health uvádí služby online konzultací se specialisty, které jsou aktuálně dostupné v zemi ${context.countryName}. Dostupnost závisí na službě, zdravotníkovi a termínech objednání. Některé obtíže vyžadují osobní vyšetření nebo jiný typ péče.`,
    },
    whoFor: {
      eyebrow: "Pro koho může být vhodná",
      title: "Kdy můžete zvážit objednání",
      intro: "Konzultace se specialistou může být užitečná, pokud chcete své obtíže probrat se zdravotníkem působícím v konkrétním oboru.",
      items: [
        "Bylo vám doporučeno odborné vyšetření specialistou",
        "Chcete probrat stávající obtíže nebo plánovanou následnou péči",
        "Chcete získat další odborný názor, pokud je to vhodné",
        "Chcete zjistit, zda je online konzultace se specialistou vhodným dalším krokem",
      ],
    },
    commonReasons,
    process: {
      eyebrow: "Jak to funguje",
      title: "Od výběru služby po následnou péči",
      steps: [
        { title: "Vyberte službu", body: "Projděte si aktivní služby specialistů a zveřejněné informace o nich." },
        { title: "Vyberte dostupného lékaře", body: "K objednání jsou nabídnuti pouze zdravotníci přiřazení k vybrané službě." },
        { title: "Vyberte termín", body: "Zvolte si z termínů, které jsou pro daného lékaře a službu aktuálně dostupné." },
        { title: "Dokončete objednání", body: "Zadejte požadované údaje pacienta a případně dokončete platbu." },
        { title: "Připojte se online", body: "Použijte informace o konzultaci uvedené v potvrzení objednání." },
        { title: "Projděte si další kroky", body: "Případná následná péče, dokumentace, vyšetření nebo doporučení závisí na klinickém posouzení a poskytnuté službě." },
      ],
    },
    whyChoose: {
      eyebrow: "Proč Global Health",
      title: "Jasné informace před objednáním",
      items: [
        "Dostupnost zdravotníků a služeb podle jednotlivých zemí",
        "Přehledné profily lékařů a uvedené jazyky",
        "Registrační údaje uvedené tehdy, když jsou k dispozici ověřené informace",
        "Ceny a délka konzultace uvedené tehdy, když jsou nastavené",
        "Bezpečné online objednání a potvrzení konzultace",
        "Možnost objednat lékaře vždy zahrnuje platnou přiřazenou službu specialisty",
      ],
    },
    importantInformation: {
      eyebrow: "Důležité informace",
      title: "Online specializovaná péče má svá omezení",
      paragraphs: [
        "Online konzultace nejsou vhodné pro naléhavé zdravotní stavy. Pokud potřebujete neodkladnou pomoc, kontaktujte místní tísňovou službu.",
        "Některé příznaky a zdravotní stavy vyžadují fyzické vyšetření, neodkladné posouzení nebo osobní testování. Zdravotník může doporučit jiný typ péče.",
        "Předpisy, vyšetření, doporučení, potvrzení, léčba ani jiné dokumenty nejsou nikdy zaručeny. Závisí na klinickém posouzení a příslušných místních pravidlech.",
        `Služby, zdravotníci, ceny a termíny konzultací se v zemi ${context.countryName} liší a mohou se měnit podle aktualizací aktivního katalogu.`,
      ],
    },
    faq: [
      { question: "Jak probíhá online konzultace se specialistou?", answer: "Vyberte aktivní službu specialisty, zvolte zdravotníka, který je k ní přiřazen, vyberte dostupný termín a dokončete objednání. Informace o konzultaci obdržíte po objednání." },
      { question: "Potřebuji doporučení?", answer: "Požadavky na doporučení se mohou lišit podle služby a klinické situace. Přečtěte si podrobnosti konkrétní služby a při objednání poskytněte vyžádané doporučení nebo relevantní zdravotní informace." },
      { question: "Které specializované obory jsou dostupné?", answer: "Karty služeb na této stránce představují aktivní služby specialistů, které jsou aktuálně dostupné pro vybranou zemi. Dostupnost se může měnit." },
      { question: "Jak jsou vybíráni lékaři uvedení na této stránce?", answer: "Lékař se zobrazí, pokud je aktivní ve vybrané zemi a má aktivní přiřazení alespoň k jedné zde uvedené službě specialisty. Označení specializací slouží k popisu, nikoli jako pravidlo způsobilosti k objednání." },
      { question: "Kolik konzultace stojí a jak dlouho trvá?", answer: "Pokud jsou tyto údaje nastavené, karta každé služby uvádí počáteční cenu a délku konzultace. Před platbou si ověřte vybranou službu, lékaře a podrobnosti konzultace." },
      { question: "Je online konzultace vhodná pro každé zdravotní téma?", answer: "Ne. Pokud nelze dané obtíže bezpečně řešit online, zdravotník může doporučit neodkladné nebo osobní vyšetření." },
    ],
    emptyState: {
      title: "Žádní specialisté nyní nejsou k dispozici pro objednání",
      body: "V této zemi nyní nejsou žádná aktivní přiřazení lékařů ke službám specialistů. Můžete si prohlédnout katalog služeb nebo to zkusit znovu později.",
    },
  };
}

function csTestsContent(context: HubContext): ServiceHubContent {
  return {
    resolvedLocale: "cs",
    overview: {
      eyebrow: "Přehled",
      title: "Zdravotní testy s informacemi ke konkrétním produktům",
      body: `Tato stránka uvádí zdravotní testy, které jsou aktuálně dostupné v zemi ${context.countryName}. Každý test má vlastní cenu, stav zásob, informace o vzorku a předpokládanou dobu dodání výsledků, pokud jsou tyto údaje nastavené.`,
    },
    whoFor: {
      eyebrow: "Pro koho může být vhodný",
      title: "Kdy může být zdravotní test užitečný",
      intro: "Test vám může pomoci získat informace o konkrétní zdravotní otázce popsané na stránce daného produktu.",
      items: [
        "Chcete si ověřit ukazatele nebo oblasti zahrnuté v nabízeném testu",
        "Bylo vám doporučeno podstoupit konkrétní test",
        "Dokážete postupovat podle pokynů k odběru vzorku uvedených u daného produktu",
        "Rozumíte tomu, že výsledek testu nenahrazuje neodkladné ani komplexní klinické vyšetření",
      ],
    },
    process: {
      eyebrow: "Objednání",
      title: "Jak objednání funguje",
      steps: [
        { title: "Prohlédněte si test", body: "Otevřete stránku produktu a zkontrolujte, co test zahrnuje, typ vzorku, cenu, dostupnost a případnou zveřejněnou dobu zpracování." },
        { title: "Přidejte jej do košíku", body: "Produkt přidejte pouze tehdy, když je test dostupný a jeho údaje odpovídají tomu, co potřebujete." },
        { title: "Dokončete nákup", body: "Potvrďte údaje objednávky a pacienta, cenu a případné poplatky specifické pro produkt uvedené při dokončení nákupu." },
        { title: "Postupujte podle pokynů", body: "Řiďte se pokyny k odběru, vrácení nebo návštěvě, které byly dodány ke konkrétnímu objednanému testu." },
      ],
    },
    secondaryProcess: {
      eyebrow: "Odběr vzorku",
      title: "Postup závisí na konkrétním testu",
      steps: [
        { title: "Zkontrolujte typ vzorku", body: "Katalog a stránka produktu uvádějí nastavený typ vzorku, pokud je tento údaj dostupný." },
        { title: "Přečtěte si pokyny k produktu", body: "Požadavky na přípravu, odběr a přepravu se mohou lišit, proto se řiďte pokyny dodanými k danému testu." },
        { title: "Použijte uvedený způsob", body: "Doručení, odběr, návštěva kliniky nebo způsob vrácení se liší podle produktu a země a je třeba je ověřit před objednáním." },
      ],
    },
    results: {
      eyebrow: "Výsledky a další kroky",
      title: "Přečtěte si dobu zpracování a informace o následném postupu pro váš test",
      paragraphs: [
        "Pokud je nastavena doba dodání výsledků, zobrazí se na kartě a stránce příslušného testu. Jde o odhad pro daný produkt, nikoli o záruku pro každou objednávku.",
        "U každého testu musí být uvedeno, jak jsou výsledky poskytnuty a zda je zahrnuto jejich posouzení zdravotníkem. Tato stránka nepředpokládá, že každý test zahrnuje konzultaci nebo klinické posouzení.",
        "Výsledek může být nutné vyhodnotit společně s příznaky, zdravotní anamnézou, vyšetřením nebo dalšími testy. Pokud si nejste jisti, co výsledek znamená, vyhledejte odpovídající odbornou radu.",
      ],
    },
    whyChoose: {
      eyebrow: "Proč Global Health",
      title: "Katalog testů pro konkrétní zemi",
      items: [
        "Uvádějí se pouze aktivní testy pro vybranou zemi",
        "Zobrazuje se aktuálně nastavená cena a měna",
        "Před objednáním položky se zohledňuje její stav zásob",
        "Typ vzorku a doba dodání výsledků se zobrazují, pokud jsou dostupné",
        "Stránky produktů mohou uvádět konkrétní rozsah testu a často kladené otázky",
        "Bezpečný košík a dokončení nákupu",
      ],
    },
    importantInformation: {
      eyebrow: "Důležitá omezení",
      title: "Test nenahrazuje neodkladnou ani komplexní klinickou péči",
      paragraphs: [
        "Pokud potřebujete neodkladné vyšetření, neobjednávejte online test. Potřebujete-li okamžitou pomoc, kontaktujte místní tísňovou službu.",
        "Testy mají vymezený rozsah a omezení. Normální výsledek nevylučuje všechny zdravotní stavy a abnormální výsledek sám o sobě neurčuje diagnózu.",
        "Způsob odběru, dostupnost, zpracování, doručení, doba dodání výsledků a následný postup se mohou lišit podle testu a země. Řiďte se údaji uvedenými u konkrétního produktu.",
        "Pokud jsou příznaky nové, závažné, zhoršují se nebo ve vás vyvolávají obavy, vyhledejte odpovídající klinické vyšetření a nespoléhejte pouze na výsledek testu.",
      ],
    },
    faq: [
      { question: "Které testy jsou dostupné v mé zemi?", answer: "Karty produktů na této stránce představují aktivní zdravotní testy, které jsou aktuálně dostupné pro vybranou zemi. Pokud se žádné karty nezobrazí, není nyní k dispozici žádný aktivní katalog, ze kterého by bylo možné objednávat." },
      { question: "Jaký vzorek budu muset poskytnout?", answer: "Požadavky na vzorek se liší. Před objednáním si na stránce konkrétního testu ověřte typ vzorku a přečtěte si úplné pokyny." },
      { question: "Jak dlouho trvá získání výsledků?", answer: "Pokud je předpokládaná doba dostupná, je uvedena u konkrétního testu. Doba zpracování se může lišit a test nelze považovat za službu pro naléhavé zdravotní stavy." },
      { question: "Jak výsledky obdržím?", answer: "Způsob poskytnutí výsledků závisí na konkrétním testu. Řiďte se informacemi a pokyny k produktu a své objednávce." },
      { question: "Zahrnuje každý test posouzení zdravotníkem?", answer: "Ne vždy. Posouzení zdravotníkem nebo konzultaci považujte za součást testu pouze tehdy, když je to výslovně uvedeno v jeho podrobnostech." },
      { question: "Může zdravotní test nahradit konzultaci?", answer: "Žádný jednotlivý test nenahrazuje posouzení příznaků, anamnézy a dalších klinických informací. Pokud potřebujete výsledky vysvětlit nebo máte nadále obavy, vyhledejte odpovídající odbornou radu." },
    ],
    emptyState: {
      title: "Žádné zdravotní testy nyní nejsou k dispozici",
      body: `V zemi ${context.countryName} nyní nejsou k objednání žádné aktivní produkty zdravotních testů.`,
    },
  };
}

export function getPtServiceHubContent(
  kind: "specialist" | "tests",
  context: HubContext,
): ServiceHubContent {
  return kind === "specialist" ? ptSpecialistContent(context) : ptTestsContent(context);
}

export function getCsServiceHubContent(
  kind: "specialist" | "tests",
  context: HubContext,
): ServiceHubContent {
  return kind === "specialist" ? csSpecialistContent(context) : csTestsContent(context);
}
