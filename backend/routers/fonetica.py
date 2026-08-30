import asyncio
from config import generar_audio, GEMINI_MODEL, client, get_current_user
from models import EntrenamientoPares

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends
import os
import json

router = APIRouter()


@router.get("/api/fonemas")
def obtener_fonemas():
    fonemas_prioritarios = [
        # VOCALES
        {
            "id": "schwa",
            "simbolo": "/\u0259/",
            "nombre": "El Schwa (Sonido Rey)",
            "desc": "Relaja TODA la boca y la lengua. No muevas los labios. Haz un sonido corto y gutural desde la garganta.",
            "ejemplos": [
                "about (/\u0259\u02c8ba\u028at/)",
                "taken (/\u02c8te\u026ak\u0259n/)",
                "pencil (/\u02c8p\u025bns\u0259l/)",
            ],
        },
        {
            "id": "i_corta",
            "simbolo": "/\u026a/",
            "nombre": "La 'i' Corta",
            "desc": "Boca relajada, un poco abierta. NO sonrías. Suena a medio camino entre tu 'e' y tu 'i'.",
            "ejemplos": [
                "ship (/\u0283\u026ap/)",
                "sit (/s\u026at/)",
                "kid (/k\u026ad/)",
            ],
        },
        {
            "id": "i_larga",
            "simbolo": "/i\u02d0/",
            "nombre": "La 'i' Larga",
            "desc": "Estira los labios tensándolos como si sonrieras grande. Tensa la lengua hacia arriba y adelante.",
            "ejemplos": [
                "sheep (/\u0283i\u02d0p/)",
                "seat (/si\u02d0t/)",
                "key (/ki\u02d0/)",
            ],
        },
        {
            "id": "u_corta",
            "simbolo": "/\u028a/",
            "nombre": "La 'u' Corta",
            "desc": "Labios ligeramente redondeados pero muy relajados (no apretados). Lengua hacia atrás.",
            "ejemplos": [
                "book (/b\u028ak/)",
                "put (/p\u028at/)",
                "good (/\u0261\u028ad/)",
            ],
        },
        {
            "id": "u_larga",
            "simbolo": "/u\u02d0/",
            "nombre": "La 'u' Larga",
            "desc": "Haz un círculo pequeño y muy apretado con los labios (como para soplar una vela). Tensa la boca.",
            "ejemplos": [
                "blue (/blu\u02d0/)",
                "food (/fu\u02d0d/)",
                "shoe (/\u0283u\u02d0/)",
            ],
        },
        {
            "id": "e_corta",
            "simbolo": "/\u025b/",
            "nombre": "La 'e' Corta",
            "desc": "Abre la boca un poco más, labios relajados, lengua en el centro. (Igual a la 'e' de España).",
            "ejemplos": ["bed (/b\u025bd/)", "red (/r\u025bd/)", "head (/h\u025bd/)"],
        },
        {
            "id": "schwa_largo",
            "simbolo": "/\u025c\u02d0/",
            "nombre": "El Schwa Largo",
            "desc": "Boca entreabierta y relajada, lengua plana. Haz vibrar la garganta de forma alargada.",
            "ejemplos": [
                "bird (/b\u025c\u02d0rd/)",
                "work (/w\u025c\u02d0rk/)",
                "learn (/l\u025c\u02d0rn/)",
            ],
        },
        {
            "id": "o_larga",
            "simbolo": "/\u0254\u02d0/",
            "nombre": "La 'o' Larga",
            "desc": "Abre la boca formando una 'O' vertical alta, tensa los labios. Lengua plana y atrás.",
            "ejemplos": [
                "door (/d\u0254\u02d0r/)",
                "more (/m\u0254\u02d0r/)",
                "board (/b\u0254\u02d0rd/)",
            ],
        },
        {
            "id": "a_gato",
            "simbolo": "/\u00e6/",
            "nombre": "La 'A' Abierta",
            "desc": "Boca ABIERTA hacia abajo al máximo. Estira los labios a los lados y empuja la lengua hacia adelante. Intenta decir 'a' pero sonando a 'e'.",
            "ejemplos": ["cat (/k\u00e6t/)", "black (/bl\u00e6k/)", "map (/m\u00e6p/)"],
        },
        {
            "id": "a_neutra",
            "simbolo": "/\u028c/",
            "nombre": "La 'a' Neutra",
            "desc": "Boca semiabierta. Lengua relajada. Da un golpe de sonido corto y seco desde la garganta.",
            "ejemplos": [
                "cup (/k\u028cp/)",
                "luck (/l\u028ck/)",
                "blood (/bl\u028cd/)",
            ],
        },
        {
            "id": "a_larga",
            "simbolo": "/\u0251\u02d0/",
            "nombre": "La 'a' Larga",
            "desc": "Abre la boca al máximo (como en el dentista). Lengua totalmente plana abajo. Sonido largo.",
            "ejemplos": [
                "car (/k\u0251\u02d0r/)",
                "father (/\u02c8f\u0251\u02d0\u00f0\u0259r/)",
                "star (/st\u0251\u02d0r/)",
            ],
        },
        {
            "id": "o_corta",
            "simbolo": "/\u0252/",
            "nombre": "La 'o' Corta",
            "desc": "Labios en forma redonda pero con la mandíbula caída muy abierta. Golpe de voz corto.",
            "ejemplos": ["hot (/h\u0252t/)", "box (/b\u0252ks/)", "stop (/st\u0252p/)"],
        },
        # --- DIPTONGOS (8) ---
        {
            "id": "dip_ei",
            "simbolo": "/e\u026a/",
            "nombre": "Diptongo EI",
            "desc": "Empieza con boca abierta relajada y ciérrala estirando a una sonrisa tensa.",
            "ejemplos": ["day (/de\u026a/)", "say (/se\u026a/)", "make (/me\u026ak/)"],
        },
        {
            "id": "dip_ai",
            "simbolo": "/a\u026a/",
            "nombre": "Diptongo AI",
            "desc": "Abre la boca en grande y deslízala cerrando hacia una sonrisa tensa.",
            "ejemplos": ["my (/ma\u026a/)", "eye (/a\u026a/)", "time (/ta\u026am/)"],
        },
        {
            "id": "dip_oi",
            "simbolo": "/\u0254\u026a/",
            "nombre": "Diptongo OI",
            "desc": "Empieza con labios en 'O' redonda y desliza hacia una sonrisa estirada.",
            "ejemplos": [
                "boy (/b\u0254\u026a/)",
                "toy (/t\u0254\u026a/)",
                "coin (/k\u0254\u026an/)",
            ],
        },
        {
            "id": "dip_au",
            "simbolo": "/a\u028a/",
            "nombre": "Diptongo AU",
            "desc": "Abre la boca en grande y ciérrala haciendo un círculo apretado con los labios.",
            "ejemplos": ["now (/na\u028a/)", "how (/ha\u028a/)", "house (/ha\u028as/)"],
        },
        {
            "id": "dip_ou",
            "simbolo": "/o\u028a/",
            "nombre": "Diptongo OU",
            "desc": "Haz una 'O' relajada y aprieta los labios hasta hacer un círculo pequeñito.",
            "ejemplos": [
                "go (/\u0261o\u028a/)",
                "no (/no\u028a/)",
                "show (/\u0283o\u028a/)",
            ],
        },
        {
            "id": "dip_ia",
            "simbolo": "/\u026a\u0259/",
            "nombre": "Diptongo IA",
            "desc": "Empieza con sonrisa relajada y suelta la tensión volviendo al centro (Schwa).",
            "ejemplos": [
                "here (/h\u026a\u0259r/)",
                "near (/n\u026a\u0259r/)",
                "idea (/a\u026a\u02c8d\u026a\u0259/)",
            ],
        },
        {
            "id": "dip_ea",
            "simbolo": "/e\u0259/",
            "nombre": "Diptongo EA",
            "desc": "Empieza con boca entreabierta y relaja toda la boca volviendo al centro (Schwa).",
            "ejemplos": [
                "hair (/he\u0259r/)",
                "there (/\u00f0e\u0259r/)",
                "care (/ke\u0259r/)",
            ],
        },
        {
            "id": "dip_ua",
            "simbolo": "/\u028a\u0259/",
            "nombre": "Diptongo UA",
            "desc": "Empieza con labios redondeados y relájalos completamente (Schwa).",
            "ejemplos": [
                "tour (/t\u028a\u0259r/)",
                "pure (/pj\u028a\u0259r/)",
                "cure (/kj\u028a\u0259r/)",
            ],
        },
        # --- CONSONANTES (24) ---
        {
            "id": "p_fuerte",
            "simbolo": "/p/",
            "nombre": "La 'P' Explosiva",
            "desc": "Junta los labios apretados. Suelta el aire de golpe estallando. SIN vibrar la garganta.",
            "ejemplos": [
                "pen (/p\u025bn/)",
                "top (/t\u0252p/)",
                "push (/p\u028a\u0283/)",
            ],
        },
        {
            "id": "b_fuerte",
            "simbolo": "/b/",
            "nombre": "La 'B' Fuerte",
            "desc": "Junta los labios. Suelta el aire de golpe, pero HACIENDO VIBRAR la garganta.",
            "ejemplos": [
                "berry (/\u02c8b\u025bri/)",
                "bowel (/\u02c8ba\u028a\u0259l/)",
                "back (/b\u00e6k/)",
            ],
        },
        {
            "id": "t_fuerte",
            "simbolo": "/t/",
            "nombre": "La 'T' Explosiva",
            "desc": "Punta de la lengua justo detrás de los dientes superiores. Estalla el aire. SIN vibrar.",
            "ejemplos": ["time (/ta\u026am/)", "cat (/k\u00e6t/)", "tell (/t\u025bl/)"],
        },
        {
            "id": "d_fuerte",
            "simbolo": "/d/",
            "nombre": "La 'D' Fuerte",
            "desc": "Lengua detrás de los dientes superiores. Suelta el aire VIBRANDO la garganta.",
            "ejemplos": [
                "dog (/d\u0252\u0261/)",
                "day (/de\u026a/)",
                "bed (/b\u025bd/)",
            ],
        },
        {
            "id": "k_fuerte",
            "simbolo": "/k/",
            "nombre": "La 'K' Fuerte",
            "desc": "Sube la parte de atrás de la lengua para bloquear la garganta. Estalla el aire. SIN vibrar.",
            "ejemplos": ["cat (/k\u00e6t/)", "key (/ki\u02d0/)", "back (/b\u00e6k/)"],
        },
        {
            "id": "g_fuerte",
            "simbolo": "/g/",
            "nombre": "La 'G' Fuerte",
            "desc": "Igual que la /k/, pero VIBRANDO fuertemente la garganta.",
            "ejemplos": [
                "go (/\u0261o\u028a/)",
                "get (/\u0261\u025bt/)",
                "big (/b\u026a\u0261/)",
            ],
        },
        {
            "id": "f_suave",
            "simbolo": "/f/",
            "nombre": "La 'F'",
            "desc": "Apoya los dientes superiores sobre tu labio inferior. Sopla aire. SIN vibrar.",
            "ejemplos": [
                "fly (/fla\u026a/)",
                "four (/f\u0254\u02d0r/)",
                "leaf (/li\u02d0f/)",
            ],
        },
        {
            "id": "v_labio",
            "simbolo": "/v/",
            "nombre": "La 'V' Vibrante",
            "desc": "Dientes superiores sobre labio inferior. Sopla aire y VIBRA la garganta fuerte (cosquillas en el labio).",
            "ejemplos": [
                "very (/\u02c8v\u025bri/)",
                "vowel (/\u02c8va\u028a\u0259l/)",
                "save (/se\u026av/)",
            ],
        },
        {
            "id": "th_sordo",
            "simbolo": "/\u03b8/",
            "nombre": "El 'TH' Sordo",
            "desc": "Saca la punta de la lengua entre los dientes. Sopla aire continuo. SIN vibrar la garganta.",
            "ejemplos": [
                "think (/\u03b8\u026a\u014bk/)",
                "math (/m\u00e6\u03b8/)",
                "both (/bo\u028a\u03b8/)",
            ],
        },
        {
            "id": "th_sonoro",
            "simbolo": "/\u00f0/",
            "nombre": "El 'TH' Vibrante",
            "desc": "Lengua entre los dientes. Sopla aire y VIBRA la garganta (se siente como un zumbido de abeja).",
            "ejemplos": [
                "this (/\u00f0\u026as/)",
                "mother (/\u02c8m\u028c\u00f0\u0259r/)",
                "breathe (/bri\u02d0\u00f0/)",
            ],
        },
        {
            "id": "s_suave",
            "simbolo": "/s/",
            "nombre": "La 'S' Suave",
            "desc": "Junta los dientes, lengua detrás. Sopla aire siseando. SIN vibrar.",
            "ejemplos": ["sun (/s\u028cn/)", "bus (/b\u028cs/)", "face (/fe\u026as/)"],
        },
        {
            "id": "z_vibra",
            "simbolo": "/z/",
            "nombre": "La 'Z' de Abeja",
            "desc": "Junta los dientes. Sopla aire y VIBRA la garganta fuerte (imita a una mosca/abeja).",
            "ejemplos": [
                "zero (/\u02c8z\u026aro\u028a/)",
                "buzz (/b\u028cz/)",
                "phase (/fe\u026az/)",
            ],
        },
        {
            "id": "sh_silencio",
            "simbolo": "/\u0283/",
            "nombre": "El sonido 'SH'",
            "desc": "Empuja los labios hacia afuera (como pidiendo silencio 'shhh'). Sopla aire. SIN vibrar.",
            "ejemplos": [
                "she (/\u0283i\u02d0/)",
                "shoe (/\u0283u\u02d0/)",
                "crash (/kr\u00e6\u0283/)",
            ],
        },
        {
            "id": "zh_suave",
            "simbolo": "/\u0292/",
            "nombre": "La 'SH' Vibrante",
            "desc": "Labios hacia afuera como 'shhh', pero VIBRANDO la garganta (como un motor).",
            "ejemplos": [
                "measure (/\u02c8m\u025b\u0292\u0259r/)",
                "vision (/\u02c8v\u026a\u0292\u0259n/)",
                "television (/\u02c8t\u025bl\u026av\u026a\u0292\u0259n/)",
            ],
        },
        {
            "id": "h_aire",
            "simbolo": "/h/",
            "nombre": "La 'H' Aspirada",
            "desc": "Abre la boca relajada y exhala aire desde el fondo (como empañando un espejo). SIN raspar.",
            "ejemplos": [
                "hat (/h\u00e6t/)",
                "home (/ho\u028am/)",
                "hello (/h\u0259\u02c8lo\u028a/)",
            ],
        },
        {
            "id": "ch_fuerte",
            "simbolo": "/t\u0283/",
            "nombre": "El sonido 'CH'",
            "desc": "Empieza con la lengua tocando el paladar (T) y explota hacia afuera con labios redondos (SH).",
            "ejemplos": [
                "chair (/t\u0283e\u0259r/)",
                "cheese (/t\u0283i\u02d0z/)",
                "match (/m\u00e6t\u0283/)",
            ],
        },
        {
            "id": "j_fuerte",
            "simbolo": "/d\u0292/",
            "nombre": "La 'J' Inglesa",
            "desc": "Igual que CH, pero VIBRANDO la garganta. Suena fuerte y golpeado.",
            "ejemplos": [
                "job (/d\u0292\u0252b/)",
                "juice (/d\u0292u\u02d0s/)",
                "age (/e\u026ad\u0292/)",
            ],
        },
        {
            "id": "m_nasal",
            "simbolo": "/m/",
            "nombre": "La 'M' Nasal",
            "desc": "Junta los labios. No sueltes aire por la boca, sácalo por la nariz y VIBRA la garganta.",
            "ejemplos": [
                "man (/m\u00e6n/)",
                "make (/me\u026ak/)",
                "time (/ta\u026am/)",
            ],
        },
        {
            "id": "n_nasal",
            "simbolo": "/n/",
            "nombre": "La 'N' Nasal",
            "desc": "Lengua presionando detrás de los dientes de arriba. Aire por la nariz y VIBRA.",
            "ejemplos": ["no (/no\u028a/)", "name (/ne\u026am/)", "sun (/s\u028cn/)"],
        },
        {
            "id": "ng_nasal",
            "simbolo": "/\u014b/",
            "nombre": "La 'NG' Nasal",
            "desc": "Parte de atrás de la lengua sube y bloquea la garganta. Aire por la nariz y VIBRA.",
            "ejemplos": [
                "sing (/s\u026a\u014b/)",
                "king (/k\u026a\u014b/)",
                "ring (/r\u026a\u014b/)",
            ],
        },
        {
            "id": "l_lateral",
            "simbolo": "/l/",
            "nombre": "La 'L'",
            "desc": "Punta de la lengua firme contra el paladar. Deja que el aire escape por los lados de la lengua.",
            "ejemplos": [
                "leg (/l\u025b\u0261/)",
                "love (/l\u028cv/)",
                "feel (/fi\u02d0l/)",
            ],
        },
        {
            "id": "r_suave",
            "simbolo": "/r/",
            "nombre": "La 'R' Inglesa",
            "desc": "Tira la lengua hacia ATRÁS sin tocar el paladar en absoluto. Redondea los labios. VIBRA.",
            "ejemplos": [
                "red (/r\u025bd/)",
                "run (/r\u028cn/)",
                "car (/k\u0251\u02d0r/)",
            ],
        },
        {
            "id": "w_desliza",
            "simbolo": "/w/",
            "nombre": "La 'W'",
            "desc": "Círculo pequeño y tenso con los labios. Desliza rápido hacia el siguiente sonido vocal.",
            "ejemplos": [
                "we (/wi\u02d0/)",
                "water (/\u02c8w\u0254\u02d0t\u0259r/)",
                "win (/w\u026an/)",
            ],
        },
        {
            "id": "y_desliza",
            "simbolo": "/j/",
            "nombre": "La 'Y'",
            "desc": "Lengua arriba casi tocando el paladar (como sonriendo tensamente). Desliza rápido a la vocal.",
            "ejemplos": [
                "yes (/j\u025bs/)",
                "yellow (/\u02c8j\u025blo\u028a/)",
                "you (/ju\u02d0/)",
            ],
        },
    ]
    return fonemas_prioritarios


@router.get("/api/connected_speech")
def obtener_connected_speech():
    reglas = [
        {
            "id": "assim_t",
            "regla": "T + Y = CH",
            "nombre": "Asimilación de la T",
            "desc": "Cuando una palabra termina en sonido /t/ y la siguiente empieza con /j/ (y), se fusionan en CH.",
            "ejemplos": ["Don't you (Donchu)", "Let you (Lechu)", "Meet you (Meechu)"],
        },
        {
            "id": "assim_d",
            "regla": "D + Y = J",
            "nombre": "Asimilación de la D",
            "desc": "Cuando una palabra termina en sonido /d/ y la siguiente empieza con /j/ (y), se fusionan en la J inglesa vibrante.",
            "ejemplos": ["Did you (Didja)", "Would you (Woulja)", "Find you (Finja)"],
        },
        {
            "id": "flap_t",
            "regla": "La Flap 'T'",
            "nombre": "La 'T' Americana",
            "desc": "En USA, cuando una 't' o 'tt' queda atrapada entre dos sonidos vocales, se pronuncia como una 'r' suave y rápida.",
            "ejemplos": ["Water (Wader)", "Better (Beder)", "City (Cidy)"],
        },
        {
            "id": "elision_h",
            "regla": "Adiós a la 'H'",
            "nombre": "Elisión de Pronombres",
            "desc": "La 'h' inicial en him, her, he, his a menudo desaparece al hablar rápido porque el aire no se detiene.",
            "ejemplos": [
                "Tell him (Tellim)",
                "Call her (Caller)",
                "I like his (I likis)",
            ],
        },
        {
            "id": "link_cv",
            "regla": "Consonante + Vocal",
            "nombre": "Linking C-V",
            "desc": "Si una palabra termina en consonante y la otra empieza en vocal, se unen como si fueran una sola palabra larga.",
            "ejemplos": [
                "Stop it (Sto pit)",
                "Not at all (No ta tall)",
                "An apple (A napple)",
            ],
        },
        # TARJETAS DE REDUCCIONES
        {
            "id": "red_verbos",
            "regla": "Gonna / Wanna",
            "nombre": "Reducción de Verbos",
            "desc": "El 'to' pierde toda su fuerza y se fusiona con el verbo anterior convirtiéndose en un sonido Schwa.",
            "ejemplos": ["Going to (Gonna)", "Want to (Wanna)", "Got to (Gotta)"],
        },
        {
            "id": "red_obligacion",
            "regla": "Hafta / Usta",
            "nombre": "Obligación y Costumbre",
            "desc": "La 'v' y la 'd' se contagian del sonido sordo de la 't'. El 'to' se reduce a Schwa.",
            "ejemplos": ["Have to (Hafta)", "Used to (Usta)", "Need to (Needa)"],
        },
        {
            "id": "red_pron",
            "regla": "Lemme / Gimme",
            "nombre": "Fusión de Pronombres",
            "desc": "Al hablar rápido, el pronombre 'me' es absorbido por la consonante del verbo de acción que lo precede.",
            "ejemplos": ["Let me (Lemme)", "Give me (Gimme)", "Don't know (Dunno)"],
        },
        {
            "id": "red_prep",
            "regla": "Kinda / Sorta",
            "nombre": "Colapso de Preposiciones",
            "desc": "La preposición 'of' pierde su consonante (f/v) por completo, dejando solo un rastro de sonido Schwa.",
            "ejemplos": ["Kind of (Kinda)", "Sort of (Sorta)", "Out of (Outta)"],
        },
        {
            "id": "red_extrema",
            "regla": "I'ma",
            "nombre": "Colapso Extremo",
            "desc": "Frases completas que colapsan por inercia vocal en una sola sílaba.",
            "ejemplos": ["I am going to (I'ma)", "Come on (C'mon)"],
        },
    ]
    return reglas


@router.post("/api/entrenar_pares")
async def entrenar_pares(
    req: EntrenamientoPares, user_id: str = Depends(get_current_user)
):
    prompt = f"""
    Eres un experto en fonética inglesa. El alumno hispanohablante confunde los fonemas {req.fonema_1} y {req.fonema_2}.
    Genera EXACTAMENTE 4 pares mínimos que contrasten ambos sonidos. 
    IMPORTANTE: La clave "correcta" debe contener ESTRICTAMENTE el texto "opcion_a" o "opcion_b", no la palabra.
    
    Devuelve ESTRICTAMENTE un arreglo JSON puro, sin comillas triples ni formato markdown.
    Formato:
    [
      {{"opcion_a": "ship", "opcion_b": "sheep", "correcta": "opcion_a"}},
      {{"opcion_a": "eat", "opcion_b": "it", "correcta": "opcion_b"}}
    ]
    """
    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)

        # 1. Limpieza por si Gemini añade formato Markdown
        texto = response.text.strip()
        if texto.startswith("```json"):
            texto = texto[7:]
        if texto.startswith("```"):
            texto = texto[3:]
        if texto.endswith("```"):
            texto = texto[:-3]

        respuesta_limpia = texto.strip()
        pares = json.loads(respuesta_limpia)

        os.makedirs("static/audios/fonetica", exist_ok=True)
        tareas_audio = []

        for i, par in enumerate(pares):
            # 2. Blindaje: ¿Qué pasa si Gemini puso "ship" en lugar de "opcion_a"?
            valor_correcta = str(par.get("correcta", "opcion_a")).lower()

            if valor_correcta in ["opcion_a", "opcion_b"]:
                palabra_correcta = par.get(valor_correcta, "error")
            else:
                # Si se equivocó, asumimos que escribió la palabra directamente y lo autocorregimos
                palabra_correcta = valor_correcta
                if par.get("opcion_a", "").lower() == palabra_correcta.lower():
                    par["correcta"] = "opcion_a"
                else:
                    par["correcta"] = "opcion_b"

            # 3. Limpiar caracteres raros en el nombre del archivo para evitar errores de Windows
            nombre_limpio = "".join(c if c.isalnum() else "_" for c in palabra_correcta)
            ruta_audio = f"static/audios/fonetica/par_{i}_{nombre_limpio}.mp3"
            par["ruta_audio"] = ruta_audio

            # Generamos el audio
            tareas_audio.append(generar_audio(palabra_correcta, ruta_audio))

        if tareas_audio:
            await asyncio.gather(*tareas_audio)

        return {"pares": pares}

    except Exception as e:
        # Imprimir el error en consola
        print(f"ERROR EN EL BACKEND: {str(e)}")
        return {"error": f"Error interno: {str(e)}"}
