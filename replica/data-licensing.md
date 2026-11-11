# Data licensing — the open question that gates the backend

The VFR map (FT06) and the whole data pipeline depend on a licence-clean source
of aeronautical data for Uruguay and the region. Not legal advice — a lawyer
confirms the terms before anything ships.

## Status (2026-11-11)

- **openAIP — CC BY-NC 4.0, confirmed on their legal page.** NonCommercial, so
  the default licence does NOT cover a paid app. Owner: Garrecht Avionik GmbH.
  Coverage for Uruguay is real and structured (Carrasco TMA/CTR/ATZ seen on the
  map), and data/exports + an API are offered. So the blocker is licence, not
  coverage or format. **Action taken:** emailed contact@openaip.net to ask
  about a *commercial* licence (not whether NC allows it — it doesn't). The
  GitHub-issue route is now unnecessary.
- **DINACIA — emailed aispub@dinacia.gub.uy, awaiting reply.** Key unknown is
  the format (structured vs PDF-only) and whether commercial reuse is allowed.

If neither grants commercial use, the options are: a paid commercial licence
from openAIP, official data from DINACIA, or rescoping (e.g. personal/non-
commercial use only). Decide before /replica-backend.

The original enquiry emails are kept below for reference.

---

## Email to openAIP (English)

To: openaip.net contact form, or the email on their legal page
Subject: Data licensing for a commercial VFR EFB app (Uruguay / South America)

Hello openAIP team,

I am building a VFR electronic flight bag (EFB) app for general-aviation pilots
in Uruguay and the surrounding region, and I would like to use openAIP as the
source of aeronautical data (airports, airspace, navaids and reporting points).
Before I commit to it, I need to understand your licensing clearly.

I have seen two different statements about reuse — your site indicates the data
may ship with commercial applications as long as the data itself is not sold
separately, while some third-party projects describe the data as CC BY-NC 4.0
(non-commercial). I want to be sure which terms actually apply:

1. May I use openAIP data in a paid/subscription commercial app sold to pilots,
   where the data is one component of the product and is never sold on its own?
2. Does the licence cover using the data in processed/derived form — compiled
   into offline region packs and rendered on a moving map — not only
   redistributing your original files?
3. What attribution do you require, and is there specific wording or logo
   placement you expect?
4. Would you provide written confirmation of the permitted use for my records?
5. How do I access the data in bulk (API or download), and are there usage
   terms or rate limits I should respect?
6. How current and complete is the coverage for Uruguay and neighbouring
   countries, and how often is it updated?

The app will clearly show the data source, its effective date and AIRAC cycle,
and will state that it is not an official or primary navigation source.

Thank you very much for your work and your time.

Best regards,
Claudio de León
[email / project site]

---

## Correo a openAIP (español)

Para: formulario de contacto en openaip.net (o el correo de su página legal)
Asunto: Licencia de datos para una app EFB VFR comercial (Uruguay / Sudamérica)

Hola equipo de openAIP:

Estoy desarrollando una aplicación EFB (electronic flight bag) para vuelo VFR,
dirigida a pilotos de aviación general en Uruguay y la región, y me gustaría
usar openAIP como fuente de datos aeronáuticos (aeródromos, espacio aéreo,
radioayudas y puntos de notificación). Antes de comprometerme, necesito
entender con claridad las condiciones de licencia.

He visto dos afirmaciones distintas sobre la reutilización: su sitio indica que
los datos pueden distribuirse junto con aplicaciones comerciales siempre que los
datos en sí no se vendan por separado, mientras que algunos proyectos de
terceros los describen como CC BY-NC 4.0 (uso no comercial). Quiero asegurarme
de cuál condición aplica realmente. Mis preguntas:

1. ¿Puedo usar los datos de openAIP en una app comercial de pago o por
   suscripción vendida a pilotos, en la que los datos son un componente del
   producto y nunca se venden por sí solos?
2. ¿La licencia cubre el uso de los datos en forma procesada o derivada
   (compilados en paquetes regionales offline y mostrados en un mapa móvil), no
   solo la redistribución de sus archivos originales?
3. ¿Qué atribución exigen, y hay un texto o una ubicación de logo que esperen?
4. ¿Podrían darme una confirmación por escrito del uso permitido, para mis
   registros?
5. ¿Cómo accedo a los datos de forma masiva (API o descarga), y hay condiciones
   de uso o límites de tasa que deba respetar?
6. ¿Qué tan actualizada y completa es la cobertura de Uruguay y los países
   vecinos, y con qué frecuencia se actualiza?

La aplicación mostrará con claridad la fuente de los datos, su fecha de vigencia
y el ciclo AIRAC, e indicará que no es una fuente oficial ni de navegación
primaria.

Muchas gracias por su trabajo y por su tiempo.

Un saludo,
Claudio de León
[correo / sitio del proyecto]

---

## Correo a DINACIA (español)

Para: aispub@dinacia.gub.uy
Asunto: Consulta sobre uso de datos de la AIP en una aplicación aeronáutica

Estimados señores de la Dirección de Circulación Aérea:

Me dirijo a ustedes para consultar sobre el uso de la información publicada en la
AIP de Uruguay. Estoy desarrollando una aplicación de apoyo a la planificación
de vuelos VFR para pilotos de aviación general, y me gustaría utilizar los datos
aeronáuticos oficiales del Uruguay como fuente.

En concreto, necesitaría los siguientes conjuntos de datos de la AIP:

- Aeródromos (AD 2): coordenadas, elevación, pistas (designación, longitud,
  superficie), frecuencias y servicios.
- Espacio aéreo (ENR 2 y ENR 5): CTR, TMA y zonas restringidas, prohibidas y
  peligrosas, con sus límites laterales y verticales y su geometría.
- Radioayudas y puntos significativos (ENR 4): VOR, NDB, DME y puntos de
  notificación (VRP), con identificador, frecuencia y coordenadas.

Mis consultas son las siguientes:

1. Formato. ¿Disponen de estos datos en formato estructurado (por ejemplo AIXM,
   shapefile, GeoJSON o CSV), o únicamente como documentos PDF?
2. Actualización. ¿Cuál es el procedimiento para recibir las enmiendas en cada
   ciclo AIRAC?
3. Autorización. ¿Autorizan el uso y la redistribución de estos datos dentro de
   una aplicación de carácter comercial dirigida a pilotos?
4. Forma derivada. ¿La autorización incluiría el uso de los datos en forma
   procesada (compilados y mostrados en un mapa), y no solo la publicación del
   documento original?
5. Atribución y condiciones. ¿Qué atribución exigen y qué condiciones de
   responsabilidad establecen? La aplicación indicará de forma visible la
   fuente, la fecha de vigencia y el ciclo AIRAC, y aclarará que no constituye
   una fuente oficial ni de navegación primaria.
6. Costo. ¿Tiene algún costo o licencia asociada este uso?

Agradezco desde ya su atención y quedo a disposición para ampliar cualquier
detalle.

Cordialmente,
Claudio de León
[correo / teléfono]
