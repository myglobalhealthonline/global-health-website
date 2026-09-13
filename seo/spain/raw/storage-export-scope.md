# Spain read-only export scope

The user's attached request, section 7, explicitly authorizes: "Refresh authenticated storage through established secret configuration" and "Capture relevant stored records, hidden translations, country associations, source values and rollback data."

The exporter uses one REPEATABLE READ READ ONLY transaction. It selects Spain service copy, public prices and availability flags, FAQ/link rows including hidden translations, professional doctor copy and registration associations. Doctor columns are explicitly projected. Spain assignments explicitly omit doctorAmountCents. Spain services explicitly omit intake/booking configuration and internal editorial metadata. No patient, consultation, appointment, account, credential-document, banking, insurance payout or authentication table is queried. The professional registration claims are content under audit, not independently certified facts.

Source: backend/src/content/romania-clinical-review.ts readCountryClinicalContent and Prisma models Service, ServiceTranslation, ServiceFaq, ServiceFaqTranslation, ServiceDoctor, DoctorTranslation, DoctorMarketTranslation, DoctorFaq, ServiceLink, ServiceLinkTranslation. Only a restricted Doctor/DoctorCountry projection is read. Railway's database URL stays in the child process environment and is removed afterwards. Only the content snapshot is persisted locally under seo/spain/raw; no secret is printed or written.

The first automatic review rejected the broader snapshot. This narrower projection removes internal payout/configuration columns and makes the explicitly authorized content scope reviewable. It does not authorize a production write.

The second review also rejected the narrowed read-only snapshot because it could
not verify authorization. Neither attempt executed. Explicit owner confirmation
was requested and has not been received. Do not retry or bypass that block.
