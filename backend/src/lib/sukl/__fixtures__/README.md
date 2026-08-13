# SÚKL test fixtures

Two **throwaway, self-signed** PKCS#12 keypairs used by `certificate.test.ts` and
`transport.test.ts`. They have no relationship to the real SÚKL communication
certificate and grant access to nothing.

| File | Purpose |
|---|---|
| `self-signed-test.p12` | Valid until 2036. The happy path. |
| `expired-test.p12` | `notAfter` in Feb 2024. Exercises `SUKL_CERTIFICATE_EXPIRED`. |

Password for both: `fixture-password`.

Committed deliberately, on the same basis as the test RS256 keypair in
`backend/.env.test`: the tests must be able to prove that a wrong password is
rejected, that an expired certificate is detected, and that mutual TLS works —
none of which can be asserted without a real PKCS#12 to hand. The `.gitignore`
rule that blocks `**/*.p12` carries an explicit exception for this directory.

## Regenerating

```bash
cd backend/src/lib/sukl/__fixtures__
export MSYS_NO_PATHCONV=1   # Git Bash on Windows only, so -subj is not path-mangled

openssl req -x509 -newkey rsa:2048 -nodes -keyout v.key -out v.crt -days 3650 \
  -subj "/C=CZ/O=Global Health TEST FIXTURE/CN=sukl-test-fixture"
openssl pkcs12 -export -inkey v.key -in v.crt -out self-signed-test.p12 \
  -passout pass:fixture-password

openssl req -x509 -newkey rsa:2048 -nodes -keyout e.key -out e.crt \
  -not_before 20240101000000Z -not_after 20240201000000Z \
  -subj "/C=CZ/O=Global Health TEST FIXTURE/CN=sukl-expired-fixture"
openssl pkcs12 -export -inkey e.key -in e.crt -out expired-test.p12 \
  -passout pass:fixture-password

rm -f v.key v.crt e.key e.crt
```

**Do not pass `-legacy`.** It encrypts the PKCS#12 with RC2, which OpenSSL 3 moved
into the legacy provider that Node does not load — the file then fails to open
with `Unsupported PKCS12 PFX data` regardless of the password. This is not a
hypothetical: the same trap catches real certificates exported by Windows
certificate tooling and by Java `keytool`, which is why
`certificate-validator.ts` detects that specific failure and tells the operator to
re-export rather than blaming the password.
