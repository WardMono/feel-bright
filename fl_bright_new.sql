--
-- PostgreSQL database dump
--

\ restrict 8cPfJemZZeDH8KebqedfzlP9OkoafkoOffFQrrTRVNhl66PvOBJd7IEat25tuVl -- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
SET default_tablespace = '';
SET default_table_access_method = heap;
--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    password text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
ALTER TABLE public.admins OWNER TO postgres;
--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.admins_id_seq OWNER TO postgres;
--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;
--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_messages (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    submitted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.contact_messages OWNER TO postgres;
--
-- Name: contact_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contact_messages_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.contact_messages_id_seq OWNER TO postgres;
--
-- Name: contact_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contact_messages_id_seq OWNED BY public.contact_messages.id;
--
-- Name: content; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content (
    id bigint NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    thumbnail text,
    type character varying(50),
    category character varying(100),
    author_name text,
    country text,
    quote_title text,
    quote text,
    famous_for text,
    audio_file text,
    updated_at timestamp without time zone,
    archived boolean DEFAULT false
);
ALTER TABLE public.content OWNER TO postgres;
--
-- Name: content_article; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.content_article (
    id integer NOT NULL,
    content_id integer,
    section_text text NOT NULL,
    is_quote boolean DEFAULT false,
    section_order integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    hero_img text,
    hero_image text,
    subtitle text,
    author text
);
ALTER TABLE public.content_article OWNER TO postgres;
--
-- Name: content_article_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.content_article_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.content_article_id_seq OWNER TO postgres;
--
-- Name: content_article_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.content_article_id_seq OWNED BY public.content_article.id;
--
-- Name: contents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contents_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.contents_id_seq OWNER TO postgres;
--
-- Name: contents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contents_id_seq OWNED BY public.content.id;
--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.journal_entries (
    id integer NOT NULL,
    user_id integer,
    entry_text text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);
ALTER TABLE public.journal_entries OWNER TO postgres;
--
-- Name: journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.journal_entries_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.journal_entries_id_seq OWNER TO postgres;
--
-- Name: journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.journal_entries_id_seq OWNED BY public.journal_entries.id;
--
-- Name: results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.results (
    id integer NOT NULL,
    email text NOT NULL,
    overall_pct numeric(5, 2) DEFAULT 0,
    breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.results OWNER TO postgres;
--
-- Name: results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.results_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.results_id_seq OWNER TO postgres;
--
-- Name: results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.results_id_seq OWNED BY public.results.id;
--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    first_name text NOT NULL,
    middle_name text,
    last_name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    profile_picture text,
    password_reset_token text,
    token_expiry timestamp without time zone,
    birthday date,
    is_verified boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    archived_at timestamp without time zone,
    last_active timestamp without time zone DEFAULT now()
);
ALTER TABLE public.users OWNER TO postgres;
--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNER TO postgres;
--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
ALTER COLUMN id
SET DEFAULT nextval('public.admins_id_seq'::regclass);
--
-- Name: contact_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_messages
ALTER COLUMN id
SET DEFAULT nextval('public.contact_messages_id_seq'::regclass);
--
-- Name: content id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content
ALTER COLUMN id
SET DEFAULT nextval('public.contents_id_seq'::regclass);
--
-- Name: content_article id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_article
ALTER COLUMN id
SET DEFAULT nextval('public.content_article_id_seq'::regclass);
--
-- Name: journal_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
ALTER COLUMN id
SET DEFAULT nextval('public.journal_entries_id_seq'::regclass);
--
-- Name: results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
ALTER COLUMN id
SET DEFAULT nextval('public.results_id_seq'::regclass);
--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
ALTER COLUMN id
SET DEFAULT nextval('public.users_id_seq'::regclass);
--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, name, email, password, created_at)
FROM stdin;
1 System Administrator admin @feelbright.com $2b$10$1NgGhy7ghx4WX2oQyZv.VeXEMIyb2AW408ty1uM2Q72YuWzKNCCQy 2025 -08 -30 19 :49 :20.675962 \.--
-- Data for Name: contact_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contact_messages (id, name, email, message, submitted_at)
FROM stdin;
\.--
-- Data for Name: content; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content (
    id,
    title,
    body,
    created_at,
    thumbnail,
    type,
    category,
    author_name,
    country,
    quote_title,
    quote,
    famous_for,
    audio_file,
    updated_at,
    archived
)
FROM stdin;
83 Alfred Alfqlfqwl 2025 -08 -26 00 :39 :53.324522 / uploads / 1756139993167 - thumbnail.png reading Ethical Decision - Making \ N \ N \ N \ N \ N \ N 2025 -08 -26 00 :41 :06.50088 t 82 qwe qwe 2025 -08 -26 00 :38 :43.711862 / uploads / 1756139923663 - thumbnail.png article Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 00 :41 :07.872253 t 108 vfwefvwe fvvwefvwe 2025 -08 -26 03 :46 :34.263584 / uploads / 1756151194211 - Screenshot 2023 -11 -03 070756.png quote Quote ew f wevfvew \ N \ N wefew \ N 2025 -08 -26 03 :47 :01.659533 t 84 dasdqwd asdasdqwd 2025 -08 -26 00 :40 :40.894594 / uploads / 1756140095448 - Screenshot 2023 -09 -08 225212.png quote Quote asdasdqwd asdasqwd \ N \ N asdasdqwd \ N 2025 -08 -26 01 :00 :28.122082 t 86 Alfred Alfqlfqwl 2025 -08 -26 00 :41 :26.297736 / uploads / 1756140086293 - thumbnail.png reading Ethical Decision - Making \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :00 :37.967598 t 85 qwe qwe 2025 -08 -26 00 :41 :20.888406 / uploads / 1756140080697 - thumbnail.png article Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :00 :39.568678 t 89 wefwe fwefwef 2025 -08 -26 01 :03 :34.201118 / uploads / 1756141414149 - thumbnail.png article Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :03 :42.186845 t 88 WER WER 2025 -08 -26 01 :02 :59.64757 / uploads / 1756141379592 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :03 :43.462212 t 104 qwd qwd 2025 -08 -26 02 :07 :14.682953 / uploads / 1756145234678 - thumbnail.png reading Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :15 :39.373032 t 94 WER WER 2025 -08 -26 01 :34 :34.10977 / uploads / 1756143274102 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :35 :30.975374 t 103 WER WER 2025 -08 -26 02 :07 :07.957743 / uploads / 1756145227950 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :15 :49.91717 t 95 WER WER 2025 -08 -26 01 :35 :55.592896 / uploads / 1756143355588 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :36 :10.196941 t 107 qwd qwd 2025 -08 -26 02 :49 :11.8406 / uploads / 1756147751833 - Screenshot 2023 -11 -15 005053.png quote Quote qwd qwd \ N \ N qwd \ N 2025 -08 -26 02 :49 :30.468264 t 93 wefwe fwefwef 2025 -08 -26 01 :14 :29.304904 / uploads / 1756142069297 - thumbnail.png article Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :49 :32.718863 t 91 wefwe fwefwef 2025 -08 -26 01 :04 :02.799812 / uploads / 1756141442796 - thumbnail.png article Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :13 :58.325371 t 90 WER WER 2025 -08 -26 01 :03 :54.521489 / uploads / 1756141434518 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :14 :00.585291 t 96 WER WER 2025 -08 -26 01 :36 :15.23793 / uploads / 1756143375234 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :36 :55.962318 t 92 WER WER 2025 -08 -26 01 :14 :21.624472 / uploads / 1756142061616 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :34 :18.06159 t 97 WER WER 2025 -08 -26 01 :37 :01.149684 / uploads / 1756143421146 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 01 :49 :59.803374 t 100 qwd qwd 2025 -08 -26 01 :58 :10.897091 / uploads / 1756144690851 - thumbnail.png reading Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :04 :45.038868 t 99 qwd qwd 2025 -08 -26 01 :54 :54.658375 / uploads / 1756144494605 - thumbnail.png reading Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :04 :47.441878 t 98 WER WER 2025 -08 -26 01 :50 :06.497213 / uploads / 1756144206490 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :04 :48.949938 t 102 qwd qwd 2025 -08 -26 02 :05 :01.805594 / uploads / 1756145101801 - thumbnail.png reading Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :06 :59.758566 t 101 WER WER 2025 -08 -26 02 :04 :55.074719 / uploads / 1756145095068 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 02 :07 :01.274593 t 87 eXAMPLE eXAMPEL 2025 -08 -26 01 :01 :30.844283 / uploads / 1756143293553 - Screenshot 2023 -09 -08 233746.png quote Quote Example Example \ N \ N eXALPEM \ N 2025 -08 -26 04 :06 :22.239465 t 110 qwd qwd 2025 -08 -26 04 :40 :27.393626 / uploads / 1756154427386 - thumbnail.png article Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :40 :38.441068 t 111 qwd qwd 2025 -08 -26 04 :40 :42.623296 / uploads / 1756154442617 - thumbnail.png article Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :40 :47.666754 t 109 asc asc 2025 -08 -26 03 :48 :56.698796 / uploads / 1756151336633 - thumbnail.png reading Self - Regulation \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :40 :55.257489 t 106 qwd qwd 2025 -08 -26 02 :16 :03.682635 / uploads / 1756145763679 - thumbnail.png reading Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :40 :56.929627 t 105 WER WER 2025 -08 -26 02 :15 :55.598446 / uploads / 1756145755591 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :40 :58.245221 t 112 WER WER 2025 -08 -26 04 :41 :03.734941 / uploads / 1756154463730 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :41 :06.111849 t 113 qwe qwe 2025 -08 -26 04 :42 :28.467211 / uploads / 1756154548463 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :42 :30.67197 t 115 ReADING EXAMPLE QWE QWEVQ 2025 -08 -26 04 :45 :37.574927 / uploads / 1756154737531 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :45 :51.166424 t 114 Example Article qwe 2025 -08 -26 04 :45 :17.534858 / uploads / 1756154717487 - thumbnail.png article Emotional Intelligence \ N \ N \ N \ N \ N \ N 2025 -08 -26 04 :46 :06.310075 t 119 QWD QWDQWD 2025 -08 -27 02 :48 :57.06755 / uploads / 1756234137021 - thumbnail.png article Conflict Resolution \ N \ N \ N \ N \ N \ N 2025 -08 -27 04 :37 :36.39959 t 118 Example Article qwe 2025 -08 -26 04 :46 :13.494542 / uploads / 1756154773492 - thumbnail.png article Emotional Intelligence \ N \ N \ N \ N \ N \ N 2025 -08 -27 04 :37 :38.093196 t 117 ReADING EXAMPLE QWE QWEVQ 2025 -08 -26 04 :46 :02.378256 / uploads / 1756154762322 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N 2025 -08 -27 04 :37 :39.507937 t 116 AW DAWD AWDAWDAW 2025 -08 -26 04 :45 :47.701183 / uploads / 1756154747692 - Screenshot 2023 -10 -10 211339.png quote Quote AWDA WD AW DAW \ N \ N WDAWDAW \ N 2025 -08 -27 04 :37 :43.815407 t 121 The Battle of Century fgfgfgfg 2025 -08 -30 20 :50 :42.424389 / uploads / 1756558242380 - scratch.png quote Quote Jc The Crwd Philippines \ N \ N dffdfdfdf \ N 2025 -09 -10 18 :23 :57.241454 t 120 Epyon sadsadsdasd 2025 -08 -30 20 :49 :35.425105 / uploads / 1756558175420 - thumbnail.png article Emotional Intelligence \ N \ N \ N \ N \ N \ N 2025 -09 -10 18 :23 :59.016218 t 124 qwdqwd wdqwdqwd 2025 -09 -14 15 :58 :26.302599 / uploads / 1757836706296 - thumbnail.png reading Emotional Intelligence \ N \ N \ N \ N \ N \ N 2025 -10 -02 01 :34 :20.494926 t 123 Reading Material qwd 2025 -09 -14 15 :41 :42.526257 / uploads / 1757835702360 - thumbnail.png reading Empathy & Compassion \ N \ N \ N \ N \ N \ N 2025 -10 -02 01 :34 :22.041997 t 122 Example Example 2025 -09 -14 15 :29 :06.77676 / uploads / 1757834946479 - thumbnail.png article Emotional Creativity \ N \ N \ N \ N \ N \ N 2025 -10 -02 01 :34 :23.24887 t 125 Emotional Awareness Noticing
and naming your feelings in the moment so you can choose how to act.2025 -10 -02 02 :38 :59.175054 / uploads / 1759343939149 - thumbnail.png article Awareness \ N \ N \ N \ N \ N \ N 2025 -10 -03 10 :11 :57.874933 t 126 Emotional Awareness See your feelings clearly to quiet the noise
and respond with calm,
informed choices.2025 -10 -03 10 :42 :03.012901 / uploads / 1759459322959 - thumbnail.png article Awareness \ N \ N \ N \ N \ N \ N \ N f 127 What is Ego ? A clear look at the “ me ” story that drives your reactions — see what ’ s ego
and what ’ s you.2025 -10 -03 10 :51 :23.321618 / uploads / 1759459883277 - thumbnail.png article Self - Growth \ N \ N \ N \ N \ N \ N \ N f 128 The Voice of the Unconscious Unexpressed emotions will never die.They are buried alive
and will come forth later in uglier ways.2025 -10 -04 14 :44 :57.963712 / uploads / 1759560297904 - sieg.jpg quote Quote Sigmund Freud Austria \ N \ N Father of Psychoanalysis;
theories of the unconscious mind,
dream interpretation,
and psychosexual development.\ N 2025 -10 -04 14 :45 :25.924586 f 129 The Moral Foundation of Compassion Compassion is the basis of morality.2025 -10 -04 14 :51 :45.298975 / uploads / 1759560705152 - Arthur.jpg quote Quote Arthur Schopenhauer Germany \ N \ N Philosopher of pessimism,
metaphysics of the “ Will,
” deep influence on Nietzsche,
Freud,
and Wagner,
as well as later existential
and psychological thought.\ N 2025 -10 -04 14 :51 :45.298975 f 130 asd asd 2025 -10 -05 15 :18 :36.162799 / uploads / 1759648716134 - thumbnail.png article Self - Growth \ N \ N \ N \ N \ N \ N 2025 -10 -05 15 :18 :38.342971 t 131 asd asd 2025 -10 -05 15 :19 :00.43619 / uploads / 1759648740391 - thumbnail.png article Self - Growth \ N \ N \ N \ N \ N \ N 2025 -10 -05 15 :19 :12.928611 t 132 asd asd 2025 -10 -05 15 :24 :22.526916 / uploads / 1759649062474 - thumbnail.png article Self - Growth \ N \ N \ N \ N \ N \ N 2025 -10 -05 15 :24 :25.150681 t 133 asd asd 2025 -10 -05 15 :24 :33.573527 / uploads / 1759649073562 - thumbnail.png article Self - Growth \ N \ N \ N \ N \ N \ N 2025 -10 -05 15 :25 :00.067229 t 134 Social Skills in Emotional Intelligence “ Connecting with others through emotional intelligence.” 2025 -10 -05 15 :33 :12.13648 / uploads / 1759649592118 - thumbnail.png reading Self - Growth \ N \ N \ N \ N \ N \ N \ N f 135 The Power of Nonverbal Communication Discover how gestures,
expressions,
and body language speak louder than words.2025 -10 -05 16 :11 :15.292605 / uploads / 1759651875145 - thumbnail.png reading Interpersonal Communication \ N \ N \ N \ N \ N \ N \ N f \.--
-- Data for Name: content_article; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.content_article (
    id,
    content_id,
    section_text,
    is_quote,
    section_order,
    created_at,
    hero_img,
    hero_image,
    subtitle,
    author
)
FROM stdin;
86 82 qwd f 0 2025 -08 -26 00 :38 :43.711862 \ N / uploads / 1756139923665 - hero.png qwd 87 83 ASC f 0 2025 -08 -26 00 :39 :53.324522 \ N / uploads / 1756139993169 - hero.png CASC 88 85 qwdqwdqw f 0 2025 -08 -26 00 :41 :20.888406 \ N / uploads / 1756140080698 - hero.png qwddqwdqwd 89 85 qwd t 1 2025 -08 -26 00 :41 :20.888406 \ N / uploads / 1756140080698 - hero.png qwd 90 86 ASCqwd f 0 2025 -08 -26 00 :41 :26.297736 \ N / uploads / 1756140086294 - hero.png CASCqwd 91 88 WEF f 0 2025 -08 -26 01 :02 :59.64757 \ N / uploads / 1756141379594 - hero.png WEE 92 89 svdvsd f 0 2025 -08 -26 01 :03 :34.201118 \ N / uploads / 1756141414151 - hero.png vsdvs 93 90 WEF f 0 2025 -08 -26 01 :03 :54.521489 \ N / uploads / 1756141434519 - hero.png WEE 94 91 svdvsd f 0 2025 -08 -26 01 :04 :02.799812 \ N / uploads / 1756141442797 - hero.png vsdvs 95 92 WEF f 0 2025 -08 -26 01 :14 :21.624472 \ N / uploads / 1756142061619 - hero.png WEE 96 93 svdvsd f 0 2025 -08 -26 01 :14 :29.304904 \ N / uploads / 1756142069299 - hero.png vsdvs 97 94 WEF f 0 2025 -08 -26 01 :34 :34.10977 \ N / uploads / 1756143274105 - hero.png WEE 98 95 WEF f 0 2025 -08 -26 01 :35 :55.592896 \ N / uploads / 1756143355590 - hero.png WEE 99 96 WEF f 0 2025 -08 -26 01 :36 :15.23793 \ N / uploads / 1756143375235 - hero.png WEE 100 97 WEF f 0 2025 -08 -26 01 :37 :01.149684 \ N / uploads / 1756143421147 - hero.png WEE 101 98 WEF f 0 2025 -08 -26 01 :50 :06.497213 \ N / uploads / 1756144206492 - hero.png WEE 102 99 qwd f 0 2025 -08 -26 01 :54 :54.658375 \ N / uploads / 1756144494607 - hero.png qwd 103 100 f 0 2025 -08 -26 01 :58 :10.897091 \ N / uploads / 1756144690853 - hero.png qwd 104 100 qwd t 1 2025 -08 -26 01 :58 :10.897091 \ N / uploads / 1756144690853 - hero.png qwd 105 101 WEF f 0 2025 -08 -26 02 :04 :55.074719 \ N / uploads / 1756145095070 - hero.png WEE 106 102 qwd f 0 2025 -08 -26 02 :05 :01.805594 \ N / uploads / 1756145101803 - hero.png qwd 107 103 WEF f 0 2025 -08 -26 02 :07 :07.957743 \ N / uploads / 1756145227953 - hero.png WEE 108 104 qwd f 0 2025 -08 -26 02 :07 :14.682953 \ N / uploads / 1756145234679 - hero.png qwd 109 105 WEF f 0 2025 -08 -26 02 :15 :55.598446 \ N / uploads / 1756145755594 - hero.png WEE 110 106 qwd f 0 2025 -08 -26 02 :16 :03.682635 \ N / uploads / 1756145763680 - hero.png qwd 111 109 asc f 0 2025 -08 -26 03 :48 :56.698796 \ N / uploads / 1756151336658 - hero.png asc 112 110 qwe f 0 2025 -08 -26 04 :40 :27.393626 \ N / uploads / 1756154427389 - hero.png qwe 113 111 qwe f 0 2025 -08 -26 04 :40 :42.623296 \ N / uploads / 1756154442619 - hero.png qwe 114 112 WEF f 0 2025 -08 -26 04 :41 :03.734941 \ N / uploads / 1756154463731 - hero.png WEE 115 113 qwd f 0 2025 -08 -26 04 :42 :28.467211 \ N / uploads / 1756154548465 - hero.png awd 116 114 qwe f 0 2025 -08 -26 04 :45 :17.534858 \ N / uploads / 1756154717488 - hero.png qwe 117 115 QWD t 0 2025 -08 -26 04 :45 :37.574927 \ N / uploads / 1756154737535 - hero.png QWD 118 117 QWDESFSEF t 0 2025 -08 -26 04 :46 :02.378256 \ N / uploads / 1756154762326 - hero.png QWDSEF 119 118 qwe f 0 2025 -08 -26 04 :46 :13.494542 \ N / uploads / 1756154773492 - hero.png qwe 120 119 QWDQWD f 0 2025 -08 -27 02 :48 :57.06755 \ N / uploads / 1756234137026 - hero.png QWDQWD 121 120 saddsadsaasd f 0 2025 -08 -30 20 :49 :35.425105 \ N / uploads / 1756558175423 - hero.png adsdasasd 122 120 sdaadsdassad t 1 2025 -08 -30 20 :49 :35.425105 \ N / uploads / 1756558175423 - hero.png asdaasdda 123 122 awdawd f 0 2025 -09 -14 15 :29 :06.77676 \ N / uploads / 1757834946485 - hero.png awd 124 122 awdawd t 1 2025 -09 -14 15 :29 :06.77676 \ N / uploads / 1757834946485 - hero.png awdawd 125 122 awdawd f 2 2025 -09 -14 15 :29 :06.77676 \ N / uploads / 1757834946485 - hero.png awdawd 126 123 awd f 0 2025 -09 -14 15 :41 :42.526257 \ N / uploads / 1757835702364 - hero.png awd 127 123 wad t 1 2025 -09 -14 15 :41 :42.526257 \ N / uploads / 1757835702364 - hero.png awd 128 124 awd f 0 2025 -09 -14 15 :58 :26.302599 \ N / uploads / 1757836706299 - hero.png awd 129 124 awd t 1 2025 -09 -14 15 :58 :26.302599 \ N / uploads / 1757836706299 - hero.png awd 130 125 Emotions play a powerful role in how we think,
act,
and connect with others.Yet,
many people struggle to understand
or manage their emotional responses.This is
where emotional awareness becomes essential.Emotional awareness is the ability to recognize,
    understand,
    and manage our emotions — as well as the emotions of others.It is a crucial skill for mental health,
    personal growth,
    and building strong relationships.\ n \ nIn this article,
    we ’ ll explore what emotional awareness is,
    why it matters,
    how it affects our lives,
    and practical ways to develop it.Whether you 're trying to improve your self-understanding, reduce stress, or communicate better with others, emotional awareness is the foundation you need.\n\nFor instance, instead of simply saying “I’m mad,” emotional awareness helps you say, “I’m feeling frustrated because I felt ignored during the meeting.” emotional awareness includes the ability to recognize subtle emotional shifts — like when mild irritation builds into frustration, or when nervousness turns into panic. Being in touch with these changes allows you to respond early and more effectively, instead of reacting only when emotions become overwhelming.	f	0	2025-10-02 02:38:59.175054	\N	/uploads/1759343939163-hero.png	Understanding Your Emotions	
131	125	Self-awareness is a specific type of emotional awareness focused on understanding yourself. Leaders who are self-aware know their emotions, strengths, and weaknesses. They can reflect on how their mood affects team morale. This allows them to respond rather than react. It builds consistency and trust among colleagues.\n\nThese leaders often seek feedback and are open to learning. They maintain personal growth through reflection and honest self-evaluation. They spot their emotional triggers before they impact decisions. This awareness leads to calmer, clearer leadership. It' s the first step toward emotional competence.f 1 2025 -10 -02 02 :38 :59.175054 \ N / uploads / 1759343939163 - hero.png Self - Awareness: Knowing Yourself Deeply 132 125 “ Integrating self - awareness,
    self ‑ regulation,
    motivation,
    and empathy enables individuals to navigate their social environment effectively … rendering emotional intelligence … a precious asset in both personal
    and professional domains.” t 2 2025 -10 -02 02 :38 :59.175054 \ N / uploads / 1759343939163 - hero.png Hera Antonopoulou,
    quoted in University of Patras(2024) 133 125 Emotional awareness isn 't just about yourself—it includes sensing others’ emotions, too. Leaders who notice body language, tone, or mood shifts can better support their teams. They adjust their approach based on emotional signals. This skill improves communication and collaboration. People feel heard, valued, and more engaged.\n\nRecognizing emotions also helps in conflict prevention. By noticing tension early, leaders can address issues swiftly. This keeps relationships strong and the team focused on goals. Emotional awareness fosters empathy and stronger interpersonal connections. It creates a foundation for effective team performance.	f	3	2025-10-02 02:38:59.175054	\N	/uploads/1759343939163-hero.png	Recognizing Emotions in Others	
134	125	Emotional awareness is tied to emotional regulation: noticing emotions and choosing how to react. Leaders who can regulate themselves don’t let frustration or stress take over. Instead, they pause, reflect, and respond thoughtfully. This sets a calm tone for the whole team. Emotionally regulated leaders are trusted to make balanced decisions.\n\nLeaders model proper emotional control by taking breaks or using mindful techniques. They avoid outbursts and create a respectful workplace. Teams follow their example and manage their own emotions better. Emotional regulation supports resilience during change or crisis. It helps maintain steady performance under pressure.	f	4	2025-10-02 02:38:59.175054	\N	/uploads/1759343939163-hero.png	Emotional Regulation: Responding Wisely	
135	125	Emotionally aware leaders adjust their words and tone based on audience emotions. They know when to push, listen, encourage, or support. This empathy delivers clearer messages and builds connection. It also reduces misunderstandings and conflict. Communication becomes more effective and respectful.\n\nBy tuning into emotions, leaders can offer feedback more compassionately. They’re sensitive to timing and emotional readiness. Trust and openness grow as a result. Team members feel safe sharing concerns and ideas. This leads to richer conversations and stronger solutions.	f	5	2025-10-02 02:38:59.175054	\N	/uploads/1759343939163-hero.png	Using Emotional Awareness to Improve Communication	
136	125	Recognizing emotions helps leaders make wiser decisions. They can step back from emotional storms and see issues more clearly. This reduces mistakes made under stress or excitement. Emotionally aware leaders consider both facts and feelings—leading to more holistic outcomes. Their choices are balanced and grounded.\n\nTeams benefit when leaders explain how emotions influence decisions. It invites collaboration and empathy from everyone. The team feels more aligned and invested. Emotional awareness increases trust in leadership. Decisions are better understood and supported by the group.	f	6	2025-10-02 02:38:59.175054	\N	/uploads/1759343939163-hero.png	Emotional Awareness as a Decision-Making Tool	
137	125	Emotional awareness is crucial because it forms the backbone of effective leadership. Leaders who understand their emotions can manage stress and pressure without letting it affect their judgment. This control leads to better communication, decision-making, and conflict resolution. Teams look to emotionally aware leaders for stability and guidance. Their calm presence builds a culture of trust and mutual respect.\n\nWhen leaders are in tune with their emotions, they also become more attuned to the emotions of others. This ability to empathize strengthens team connections and encourages openness. It reduces misunderstandings and improves team collaboration. Emotional awareness also helps identify burnout or disengagement early. Ultimately, it supports both the leader’s well-being and the team' s success.f 7 2025 -10 -02 02 :38 :59.175054 \ N / uploads / 1759343939163 - hero.png Why Emotional Awareness Matters 138 126 Emotions play a powerful role in how we think,
    act,
    and connect with others.Yet,
    many people struggle to understand
    or manage their emotional responses.This is
where emotional awareness becomes essential.Emotional awareness is the ability to recognize,
    understand,
    and manage our emotions — as well as the emotions of others.It is a crucial skill for mental health,
    personal growth,
    and building strong relationships.\ n \ nIn this article,
    we ’ ll explore what emotional awareness is,
    why it matters,
    how it affects our lives,
    and practical ways to develop it.Whether you 're trying to improve your self-understanding, reduce stress, or communicate better with others, emotional awareness is the foundation you need.\n\nEmotional awareness is the ability to identify and understand your emotions and the emotions of others. It involves:\n\n•  Recognizing your own emotional states\n•  Understanding how emotions influence your thoughts and actions\n•  Being aware of the emotions of those around you\n•  Managing your emotional responses in a healthy way\n\nIt’s not just about naming emotions like “happy” or “angry”. It’s about learning to tune into subtle emotional shifts and understanding their root causes.\n\nFor instance, instead of simply saying “I’m mad,” emotional awareness helps you say, “I’m feeling frustrated because I felt ignored during the meeting.” emotional awareness includes the ability to recognize subtle emotional shifts — like when mild irritation builds into frustration, or when nervousness turns into panic. Being in touch with these changes allows you to respond early and more effectively, instead of reacting only when emotions become overwhelming.	f	0	2025-10-03 10:42:03.012901	\N	/uploads/1759459322971-hero.png	Understanding Your Emotions	
139	126	Self-awareness is a specific type of emotional awareness focused on understanding yourself. Leaders who are self-aware know their emotions, strengths, and weaknesses. They can reflect on how their mood affects team morale. This allows them to respond rather than react. It builds consistency and trust among colleagues.\n\nThese leaders often seek feedback and are open to learning. They maintain personal growth through reflection and honest self-evaluation. They spot their emotional triggers before they impact decisions. This awareness leads to calmer, clearer leadership. It' s the first step toward emotional competence.f 1 2025 -10 -03 10 :42 :03.012901 \ N / uploads / 1759459322971 - hero.png Self - Awareness: Knowing Yourself Deeply 140 126 “ Integrating self - awareness,
    self ‑ regulation,
    motivation,
    and empathy enables individuals to navigate their social environment effectively … rendering emotional intelligence … a precious asset in both personal
    and professional domains.” t 2 2025 -10 -03 10 :42 :03.012901 \ N / uploads / 1759459322971 - hero.png Hera Antonopoulou,
    quoted in University of Patras(2024) 141 126 Emotional awareness isn 't just about yourself—it includes sensing others’ emotions, too. Leaders who notice body language, tone, or mood shifts can better support their teams. They adjust their approach based on emotional signals. This skill improves communication and collaboration. People feel heard, valued, and more engaged.\n\nRecognizing emotions also helps in conflict prevention. By noticing tension early, leaders can address issues swiftly. This keeps relationships strong and the team focused on goals. Emotional awareness fosters empathy and stronger interpersonal connections. It creates a foundation for effective team performance.	f	3	2025-10-03 10:42:03.012901	\N	/uploads/1759459322971-hero.png	Recognizing Emotions in Others	
142	126	Emotional awareness is tied to emotional regulation: noticing emotions and choosing how to react. Leaders who can regulate themselves don’t let frustration or stress take over. Instead, they pause, reflect, and respond thoughtfully. This sets a calm tone for the whole team. Emotionally regulated leaders are trusted to make balanced decisions.\n\nLeaders model proper emotional control by taking breaks or using mindful techniques. They avoid outbursts and create a respectful workplace. Teams follow their example and manage their own emotions better. Emotional regulation supports resilience during change or crisis. It helps maintain steady performance under pressure.	f	4	2025-10-03 10:42:03.012901	\N	/uploads/1759459322971-hero.png	Emotional Regulation: Responding Wisely	
143	126	Emotionally aware leaders adjust their words and tone based on audience emotions. They know when to push, listen, encourage, or support. This empathy delivers clearer messages and builds connection. It also reduces misunderstandings and conflict. Communication becomes more effective and respectful.\n\nBy tuning into emotions, leaders can offer feedback more compassionately. They’re sensitive to timing and emotional readiness. Trust and openness grow as a result. Team members feel safe sharing concerns and ideas. This leads to richer conversations and stronger solutions.	f	5	2025-10-03 10:42:03.012901	\N	/uploads/1759459322971-hero.png	Using Emotional Awareness to Improve Communication	
144	126	Recognizing emotions helps leaders make wiser decisions. They can step back from emotional storms and see issues more clearly. This reduces mistakes made under stress or excitement. Emotionally aware leaders consider both facts and feelings—leading to more holistic outcomes. Their choices are balanced and grounded.\n\nTeams benefit when leaders explain how emotions influence decisions. It invites collaboration and empathy from everyone. The team feels more aligned and invested. Emotional awareness increases trust in leadership. Decisions are better understood and supported by the group.	f	6	2025-10-03 10:42:03.012901	\N	/uploads/1759459322971-hero.png	Emotional Awareness as a Decision-Making Tool	
145	126	Emotional awareness is crucial because it forms the backbone of effective leadership. Leaders who understand their emotions can manage stress and pressure without letting it affect their judgment. This control leads to better communication, decision-making, and conflict resolution. Teams look to emotionally aware leaders for stability and guidance. Their calm presence builds a culture of trust and mutual respect.\n\nWhen leaders are in tune with their emotions, they also become more attuned to the emotions of others. This ability to empathize strengthens team connections and encourages openness. It reduces misunderstandings and improves team collaboration. Emotional awareness also helps identify burnout or disengagement early. Ultimately, it supports both the leader’s well-being and the team' s success.f 7 2025 -10 -03 10 :42 :03.012901 \ N / uploads / 1759459322971 - hero.png Why Emotional Awareness Matters 146 127 The ego is the part of your personality that feels like “ I ”
    or “ self.” It connects you with the world by helping you remember,
    plan,
    and make sense of your experiences.Think of it as the bridge between your inner thoughts and what ’ s happening around you.It also helps you balance your instincts,
    morals,
    and reality.A healthy ego means you can act with awareness
    and purpose.\ n \ nAccording to psychology,
    your ego develops
    and changes over time,
    especially during life transitions
    or stress.It gives consistency to who you are
    and how you react in different situations.A strong ego supports clear thinking,
    self - control,
    and stable self - awareness.
    When the ego is weak
    or imbalanced,
    you might feel overwhelmed
    or disconnected.Understanding your ego helps you become aware of your emotional habits
    and reactions.f 0 2025 -10 -03 10 :51 :23.321618 \ N / uploads / 1759459883283 - hero.png Ego as the Center of “ I ” 147 127 In Freud ’ s model,
    the ego must balance three parts: the id (instincts),
    the superego (morals),
    and reality.The id wants instant pleasure;
the superego demands perfection;
the ego negotiates to keep things real
and socially acceptable.It uses tools called defense mechanisms — like denial
or suppression — to protect you
from anxiety.A mature ego manages emotions,
    adapts to challenges,
    and helps you function well socially.This balancing act is essential for healthy relationships
    and decision - making.\ n \ nIf your ego is too weak,
    you may act impulsively
    or let emotions run you.If it 's too strong or rigid, you might become inflexible or overly critical. Finding the middle path helps you stay grounded, thoughtful, and open to feedback. A well-balanced ego helps you stay steady during emotional challenges. It supports your growth toward self-awareness and emotional maturity.	f	1	2025-10-03 10:51:23.321618	\N	/uploads/1759459883283-hero.png	Ego’s Role in Balancing Inner Forces	
148	127	“Resilience refers to the ability to recover from challenges and setbacks … These skills can be learned and strengthened over time, benefiting both adults and children.”	t	2	2025-10-03 10:51:23.321618	\N	/uploads/1759459883283-hero.png		Kendra Cherry, (2025)
149	127	The ego shapes how you view yourself—your identity—and how you respond to the world. When you understand your ego’s patterns, you become more aware of your strengths and triggers. This self-understanding helps you choose better responses instead of reacting unconsciously. It fosters insight into why you feel afraid, angry, or anxious in certain situations. Self-understanding builds emotional intelligence and inner balance.\n\nBy observing your ego in daily life—how you act under pressure or respond to criticism—you learn more about your real self. Journaling, honest feedback, or mindful reflection can help you see how your ego shows up. Over time, you become more self-aware and intentional in your choices. Self-understanding deepens your capacity for empathy, flexibility, and growth. It’s the path to leading yourself with kindness and clarity.	f	3	2025-10-03 10:51:23.321618	\N	/uploads/1759459883283-hero.png	Ego and Self-Understanding	
150	127	One of the ego’s core mental skills is testing reality—telling what’s real from what’s imagined or felt. It helps you see if your thoughts match the situation around you. This skill prevents confusion between your internal emotions and external facts. When reality testing is strong, your decisions are based on accurate perception. That clarity supports responsible actions and wiser leadership.\n\nAt times of stress, reality testing can weaken—making you misread others or overreact. This can lead to impulsive decisions or misunderstanding. Mental health professionals view reality-testing strength as key to emotional stability. Leaders with good reality testing leadership trust can rely on feedback and avoid misjudgments. Strengthening this skill helps balance inner reactions with the real world.	f	4	2025-10-03 10:51:23.321618	\N	/uploads/1759459883283-hero.png	Ego and Reality Testing	
151	127	Ego plays a major role in managing emotions—helping you pause before you act. A robust ego manages impulses like anger or fear without letting them control you. It helps you reflect, breathe, and choose a calm and thoughtful response. Emotional regulation builds trust in yourself and with others. It’s how you stay composed during stress and conflict.\n\nWhen your ego is fragile, emotions can overwhelm and hijack your behavior. You might lash out, shut down, or act out of habit. Strengthening your ego helps you respond with kindness and purpose. Over time, this supports emotional resilience and clear communication. Emotional regulation enables you to lead with empathy and control.	f	5	2025-10-03 10:51:23.321618	\N	/uploads/1759459883283-hero.png	Ego and Emotional Regulation	
152	127	A healthy ego supports confidence—knowing your worth and standing firm when needed. It also keeps you humble—aware of limitations and open to learning. Balanced ego strength leads to self-assurance without arrogance. It allows you to give credit to others and grow from mistakes. Leadership thrives when ego is confident, not entitled.\n\nWhen ego swings too far in self-importance, it can block collaboration and feedback. A humble leader stays grounded and connected to the team’s needs. Balancing ego with humility makes your leadership relatable and trustworthy. It encourages honest communication and collective growth. Self-understanding through ego insight opens the door to genuine humility and respect.	f	6	2025-10-03 10:51:23.321618	\N	/uploads/1759459883283-hero.png	Ego, Confidence, and Humility	
153	127	Ego affects how you connect with others—whether as a leader, friend, or partner. A balanced ego helps you listen openly, stay curious, and encourage collaboration. It prevents the need to dominate or always prove yourself. Relationships flourish when ego doesn’t overshadow empathy. Trust builds when people feel safe being honest and vulnerable.\n\nIn leadership, an unchecked ego stifles innovation, dismisses feedback, and encourages silence. But a well-managed ego invites diverse perspectives and builds team ownership. Teams led by egoless or ego-aware leaders often perform better and stay longer. When ego serves the purpose of connection—not control—you lead with effectiveness and grace. Understanding your ego shapes healthier, more respectful interactions.	f	7	2025-10-03 10:51:23.321618	\N	/uploads/1759459883283-hero.png	Ego’s Impact on Relationships and Leadership	
154	130	asd	f	0	2025-10-05 15:18:36.162799	\N	/uploads/1759648716159-hero.png	asd	
155	131	asd	f	0	2025-10-05 15:19:00.43619	\N	/uploads/1759648740402-hero.png	asd	
156	132	asd	f	0	2025-10-05 15:24:22.526916	\N	/uploads/1759649062494-hero.png	asd	
157	133	asd	f	0	2025-10-05 15:24:33.573527	\N	/uploads/1759649073571-hero.png	asd	
158	134	Social skills are the outward demonstration of emotional intelligence — the ability to use emotional awareness to build and maintain healthy, effective relationships. Within Daniel Goleman’s five core components of emotional intelligence (self-awareness, self-regulation, motivation, empathy, and social skills), this final element is what translates personal insight into interpersonal impact. It represents how well a person communicates, collaborates, and influences others in emotionally intelligent ways. According to SkillsYouNeed, these abilities allow one to handle and influence other people’s emotions effectively, ensuring interactions are cooperative, respectful, and productive.	f	0	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	Understanding Social Skills within Emotional Intelligence	
159	134	Social skills are essential for success across all areas of life — from workplace relationships to family, education, and friendships. They serve as the bridge between understanding emotions and applying that understanding in real-world contexts. A person may be deeply empathetic or self-aware, but without social skill, that emotional knowledge cannot build trust or resolve conflict. Individuals with strong social skills tend to communicate more clearly, build stronger support networks, and influence situations positively. They inspire collaboration, foster inclusion, and strengthen mutual understanding, which are vital traits for personal and professional growth.	f	1	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	The Importance of Social Skills in Everyday Life	
160	134	According to the SkillsYouNeed framework, social skills encompass a range of competencies: persuasion and influencing, communication, conflict management, leadership, change management, rapport building, collaboration, and teamwork. \n\nEach plays a critical role in effective interaction:\n • Persuasion and influence help align people around shared goals.\n • Communication ensures clarity and emotional balance.\n • Conflict management turns disagreement into constructive dialogue.\n • Leadership and change management promote positive transformation.\n • Rapport and teamwork reinforce trust and cooperation.\n\nTogether, these create a holistic set of interpersonal tools that define emotionally intelligent behavior.	f	2	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	The Building Blocks of Social Skills	
161	134	Effective communication is not just about talking — it’s about understanding. Emotionally intelligent communicators listen actively, observe body language, and respond with empathy. They adapt tone, pace, and content to match the listener’s needs, ensuring that the message promotes understanding rather than defensiveness. Such communication builds trust, resolves tension, and fosters inclusion. For instance, when a colleague is stressed, a socially skilled individual senses this through emotional cues and adjusts their words and behavior to support them without judgment.	f	3	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	Communication: The Heart of Connection	
162	134	Conflict is natural wherever people interact. The difference lies in how it’s handled. Socially skilled individuals see conflict not as confrontation but as an opportunity for growth and clarification. They bring issues into the open calmly, acknowledge all perspectives, and use empathy to find common ground. Their emotional control allows them to remain objective and respectful even in tense situations. This not only resolves the issue at hand but strengthens relationships and trust — demonstrating that healthy disagreement can lead to better understanding and cooperation.	f	4	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	Conflict Management: Turning Tension into Growth	
163	134	Leadership rooted in emotional intelligence depends on the ability to motivate and guide others through understanding rather than control. Leaders with advanced social skills influence people by example — showing empathy, communicating vision clearly, and handling stress with composure. They anticipate resistance during change and address it empathetically, helping others adapt. Such leaders build psychological safety: people feel valued and heard, which makes teams more innovative and resilient. These qualities form the essence of emotionally intelligent leadership, according to both SkillsYouNeed and Goleman’s leadership research.	f	5	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	Leadership and Change through Emotional Intelligence	
164	134	Rapport is the foundation of collaboration. It’s built on trust, respect, and genuine interest in others. Emotionally intelligent individuals show warmth, openness, and curiosity — encouraging dialogue and participation. They make others feel valued and understood, which fosters cooperation. In teams, social skills ensure balance: listening equally, acknowledging diverse views, and celebrating contributions. This synergy allows teams to overcome challenges together, reinforcing that emotional intelligence is not just about self-awareness but about shared emotional effectiveness.	f	6	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	Rapport, Collaboration, and Team Dynamics	
165	134	“Social skills, in the Emotional Intelligence sense, refer to the skills needed to handle and influence other people’s emotions effectively.”	t	7	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png		SkillsYouNeed (skillsyouneed.com)
166	134	Social skills represent the “action stage” of emotional intelligence — where self-awareness, empathy, and regulation come together in interaction. The emotionally intelligent person doesn’t suppress feelings but channels them productively: anger becomes assertiveness, anxiety becomes motivation, empathy becomes connection. By refining their social skills, individuals engage in a continuous feedback loop of learning — understanding others improves self-awareness, and self-awareness, in turn, enhances relationships. Over time, this integration creates a mature, adaptable emotional presence that strengthens all areas of life.	f	8	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	Integrating Emotional Awareness with Social Interaction	
167	134	Psychologist Daniel Goleman, who popularized emotional intelligence, emphasizes that “The ability to make and maintain good relationships is the key to success — both at work and in life.” (Goleman, Working with Emotional Intelligence, 1998). His research aligns perfectly with the SkillsYouNeed framework, showing that social skills are not secondary traits but vital competencies that define effective emotional intelligence.	f	9	2025-10-05 15:33:12.13648	\N	/uploads/1759649592126-hero.png	Supporting Author	
168	135	Nonverbal communication is the process of sending and receiving messages without using words. It includes facial expressions, gestures, posture, tone of voice, and even eye movement. Much of our emotional meaning in daily interactions comes not from what we say, but from how we say it and how we behave while saying it. According to Verywell Mind, nonverbal signals make up a large part of human communication, often giving away true emotions more accurately than speech.	f	0	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	What Is Nonverbal Communication?	
169	135	The face is one of the most powerful tools for nonverbal communication. Emotions like happiness, anger, sadness, fear, and surprise can all be recognized instantly without any words. Facial expressions are largely universal—people around the world smile when happy and frown when upset. A simple expression can change the tone of a conversation or reveal how someone truly feels inside.	f	1	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	Facial Expressions	
170	135	Gestures—such as waving, pointing, or giving a thumbs up—add emphasis and meaning to spoken words. They help clarify thoughts and show enthusiasm or frustration. While some gestures are shared across cultures, others vary, making it important to be mindful of how gestures are interpreted in different societies. A calm and open movement often makes communication more welcoming and friendly.	f	2	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	Gestures and Movements	
171	135	How we carry ourselves communicates volumes. Standing tall and open shows confidence, while crossed arms or slouched shoulders might signal defensiveness or discomfort. Body posture can reflect interest, engagement, or disinterest. Being aware of your body language helps create a more positive and confident impression during communication.	f	3	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	Body Language and Posture	
172	135	Eyes are often described as “windows to the soul.” Maintaining appropriate eye contact shows attentiveness, honesty, and confidence. Avoiding eye contact, on the other hand, might suggest shyness, nervousness, or lack of interest. However, cultural norms play a big role—some cultures view direct eye contact as respectful, while others may see it as too bold.	f	4	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	Eye Contact	
173	135	The tone, pitch, speed, and volume of your voice can completely change the meaning of a sentence. Saying “I’m fine” in a calm, gentle tone sounds reassuring, but in a harsh or tense voice, it may sound irritated. This vocal variation—called paralinguistics—adds emotional depth and helps others interpret what we truly mean.	f	5	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	Tone of Voice (Paralinguistics)	
174	135	Nonverbal communication means conveying information without using words.	t	6	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png		Kendra Cherry, Verywell Mind
175	135	The distance we keep between ourselves and others is called proxemics, and it shows comfort, familiarity, and respect. Standing too close may feel invasive, while too much distance might seem cold or detached. Touch (known as haptics)—like a handshake, hug, or pat on the back—can convey warmth, sympathy, or encouragement, depending on the situation and relationship.	f	7	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	Personal Space and Touch	
176	135	Our clothing, hairstyle, grooming, and even personal belongings send powerful messages about who we are. A neat, confident appearance can make others feel comfortable and assured. While looks shouldn’t define communication, they influence first impressions and help express personality, professionalism, and confidence without words.	f	8	2025-10-05 16:11:15.292605	\N	/uploads/1759651875152-hero.png	Appearance and Physical Presence	
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.journal_entries (id, user_id, entry_text, created_at) FROM stdin;
\.


--
-- Data for Name: results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.results (id, email, overall_pct, breakdown, answers, created_at) FROM stdin;
60	yuijinshi@gmail.com	68.00	[{"end": 19, "key": "Self-Awareness", "pct": 62, "start": 0, "rawScore": 62}, {"end": 39, "key": "Self-Regulation", "pct": 61, "start": 20, "rawScore": 61}, {"end": 59, "key": "Motivation", "pct": 77, "start": 40, "rawScore": 77}, {"end": 79, "key": "Empathy", "pct": 72, "start": 60, "rawScore": 72}, {"end": 99, "key": "Social Skills", "pct": 69, "start": 80, "rawScore": 69}]	[{"q": 1, "text": "I can easily identify my emotions as I experience them.", "answer": "5"}, {"q": 2, "text": "I notice physical changes (e.g., heart rate, breathing) when my emotions shift.", "answer": "5"}, {"q": 3, "text": "I can recognize when my mood influences my decisions.", "answer": "5"}, {"q": 4, "text": "I am aware of my emotional triggers.", "answer": "5"}, {"q": 5, "text": "I reflect on how my feelings affect my behavior.", "answer": "5"}, {"q": 6, "text": "I can explain my emotions clearly to others.", "answer": "5"}, {"q": 7, "text": "I recognize the link between my emotions and my values.", "answer": "5"}, {"q": 8, "text": "I can predict how I will feel in different situations.", "answer": "5"}, {"q": 9, "text": "I am able to evaluate my strengths accurately.", "answer": "5"}, {"q": 10, "text": "I acknowledge my weaknesses without defensiveness.", "answer": "2"}, {"q": 11, "text": "I understand how stress affects my emotional state.", "answer": "1"}, {"q": 12, "text": "I am aware of how my emotions affect those around me.", "answer": "1"}, {"q": 13, "text": "I can detect subtle changes in my mood throughout the day.", "answer": "1"}, {"q": 14, "text": "I reflect on how my past experiences shape my emotions.", "answer": "1"}, {"q": 15, "text": "I seek feedback to better understand how I come across emotionally.", "answer": "1"}, {"q": 16, "text": "I know how my emotional patterns influence my relationships.", "answer": "2"}, {"q": 17, "text": "I can differentiate between primary emotions (anger, sadness, fear, joy).", "answer": "3"}, {"q": 18, "text": "I often journal, meditate, or reflect to track my emotions.", "answer": "2"}, {"q": 19, "text": "I can identify whether my emotions are rational or impulsive.", "answer": "1"}, {"q": 20, "text": "I reflect on how my emotions influence my daily choices.", "answer": "2"}, {"q": 21, "text": "I stay calm under pressure.", "answer": "3"}, {"q": 22, "text": "I avoid saying things I might later regret when upset.", "answer": "3"}, {"q": 23, "text": "I can delay immediate gratification for long-term goals.", "answer": "2"}, {"q": 24, "text": "I manage my stress effectively.", "answer": "3"}, {"q": 25, "text": "I adapt easily to unexpected changes.", "answer": "4"}, {"q": 26, "text": "I take ownership of my actions, even when outcomes are unfavorable.", "answer": "3"}, {"q": 27, "text": "I recover quickly after emotional setbacks.", "answer": "2"}, {"q": 28, "text": "I avoid reacting impulsively when angry.", "answer": "3"}, {"q": 29, "text": "I consider the consequences before making emotional decisions.", "answer": "4"}, {"q": 30, "text": "I can manage my frustration in challenging situations.", "answer": "3"}, {"q": 31, "text": "I am able to keep negative emotions from overwhelming me.", "answer": "2"}, {"q": 32, "text": "I pause and breathe before responding in conflict situations.", "answer": "3"}, {"q": 33, "text": "I can control my tone and body language when irritated.", "answer": "4"}, {"q": 34, "text": "I remain optimistic even during setbacks.", "answer": "3"}, {"q": 35, "text": "I am open to feedback without becoming defensive.", "answer": "4"}, {"q": 36, "text": "I recognize when I need rest to prevent emotional burnout.", "answer": "3"}, {"q": 37, "text": "I regulate my emotions to maintain professionalism.", "answer": "4"}, {"q": 38, "text": "I use relaxation techniques to manage stress.", "answer": "3"}, {"q": 39, "text": "I am able to stay focused even when I feel upset.", "answer": "3"}, {"q": 40, "text": "I practice self-control in emotionally charged situations.", "answer": "2"}, {"q": 41, "text": "I set personal goals and work persistently toward them.", "answer": "4"}, {"q": 42, "text": "I find ways to stay engaged even in tasks that feel repetitive or boring.", "answer": "4"}, {"q": 43, "text": "I maintain focus even when facing obstacles.", "answer": "4"}, {"q": 44, "text": "I seek opportunities for self-improvement.", "answer": "4"}, {"q": 45, "text": "I bounce back quickly from failures.", "answer": "4"}, {"q": 46, "text": "I remain optimistic about achieving my goals.", "answer": "4"}, {"q": 47, "text": "I find purpose in what I do.", "answer": "4"}, {"q": 48, "text": "I am passionate about achieving excellence.", "answer": "3"}, {"q": 49, "text": "I take initiative without waiting for instructions.", "answer": "2"}, {"q": 50, "text": "I see challenges as opportunities to grow.", "answer": "3"}, {"q": 51, "text": "I set high standards for my own performance.", "answer": "4"}, {"q": 52, "text": "I am willing to put in extra effort to reach goals.", "answer": "4"}, {"q": 53, "text": "I enjoy learning new skills.", "answer": "4"}, {"q": 54, "text": "I stay motivated even when tasks are tedious.", "answer": "4"}, {"q": 55, "text": "I celebrate small achievements along the way.", "answer": "4"}, {"q": 56, "text": "I visualize my long-term success regularly.", "answer": "4"}, {"q": 57, "text": "I stay focused on goals despite distractions.", "answer": "5"}, {"q": 58, "text": "I am willing to sacrifice short-term comfort for long-term growth.", "answer": "4"}, {"q": 59, "text": "I seek feedback to improve my performance.", "answer": "4"}, {"q": 60, "text": "I persevere even when results are slow.", "answer": "4"}, {"q": 61, "text": "I can sense when others are upset even if they don' t say it.", " answer ": " 5 "}, {" q ": 62, " text ": " I listen attentively
    when someone shares their feelings.", " answer ": " 4 "}, {" q ": 63, " text ": " I try to put myself in others ' shoes.", "answer": "3"}, {"q": 64, "text": "I recognize non-verbal cues such as body language and tone.", "answer": "3"}, {"q": 65, "text": "I validate other people' s emotions.", " answer ": " 2 "}, {" q ": 66, " text ": " I avoid judging others before understanding their perspective.", " answer ": " 2 "}, {" q ": 67, " text ": " I can adapt my response based on how others feel.", " answer ": " 1 "}, {" q ": 68, " text ": " I recognize
    when I 'm emotionally overwhelmed by others' problems
    and take steps to protect my well - being.", " answer ": " 2 "}, {" q ": 69, " text ": " I respect cultural
    and emotional differences.", " answer ": " 4 "}, {" q ": 70, " text ": " I make people feel heard
    and understood.", " answer ": " 4 "}, {" q ": 71, " text ": " I recognize
    when my words affect others emotionally.", " answer ": " 5 "}, {" q ": 72, " text ": " I am aware
    when someone is uncomfortable in a situation.", " answer ": " 3 "}, {" q ": 73, " text ": " I show compassion to people who are struggling.", " answer ": " 4 "}, {" q ": 74, " text ": " I adjust my communication style depending on who I 'm speaking with.", "answer": "5"}, {"q": 75, "text": "I am able to comfort others when they are distressed.", "answer": "4"}, {"q": 76, "text": "I understand the needs of people even without being told.", "answer": "5"}, {"q": 77, "text": "I recognize when someone needs space instead of comfort.", "answer": "5"}, {"q": 78, "text": "I can anticipate how people might react emotionally.", "answer": "4"}, {"q": 79, "text": "I take time to consider how decisions affect others.", "answer": "3"}, {"q": 80, "text": "I respond with patience to people in emotional distress.", "answer": "4"}, {"q": 81, "text": "I build rapport easily with new people.", "answer": "5"}, {"q": 82, "text": "I communicate my ideas clearly and confidently.", "answer": "5"}, {"q": 83, "text": "I actively listen in conversations.", "answer": "5"}, {"q": 84, "text": "I manage conflict in a constructive way.", "answer": "5"}, {"q": 85, "text": "I collaborate effectively in group settings.", "answer": "5"}, {"q": 86, "text": "I maintain positive relationships even under stress.", "answer": "5"}, {"q": 87, "text": "I can influence others without being forceful.", "answer": "4"}, {"q": 88, "text": "I adapt my communication style to different audiences.", "answer": "4"}, {"q": 89, "text": "I am skilled at giving constructive feedback.", "answer": "4"}, {"q": 90, "text": "I resolve misunderstandings quickly.", "answer": "4"}, {"q": 91, "text": "I make an effort to include others in discussions.", "answer": "5"}, {"q": 92, "text": "I am comfortable leading group activities.", "answer": "5"}, {"q": 93, "text": "I show appreciation for others' contributions.", " answer ": " 2 "}, {" q ": 94, " text ": " I handle criticism gracefully in social situations.", " answer ": " 1 "}, {" q ": 95, " text ": " I can persuade others toward a shared vision.", " answer ": " 1 "}, {" q ": 96, " text ": " I am effective at networking
    and building connections.", " answer ": " 2 "}, {" q ": 97, " text ": " I recognize group dynamics
    and adjust my role as needed.", " answer ": " 2 "}, {" q ": 98, " text ": " I know how to keep conversations going
    and make others feel comfortable in social settings.", " answer ": " 2 "}, {" q ": 99, " text ": " I help mediate
    when others are in conflict.", " answer ": " 1 "}, {" q ": 100, " text ": " I foster teamwork
    and cooperation among peers.", " answer ": " 2 "}]	2025-10-17 02:12:36.928127
61	yuijinshi@gmail.com	80.00	[{"
end ": 19, " key ": " Self - Awareness ", " pct ": 90, " start ": 0, " rawScore ": 90}, {"
end ": 39, " key ": " Self - Regulation ", " pct ": 85, " start ": 20, " rawScore ": 85}, {"
end ": 59, " key ": " Motivation ", " pct ": 64, " start ": 40, " rawScore ": 64}, {"
end ": 79, " key ": " Empathy ", " pct ": 75, " start ": 60, " rawScore ": 75}, {"
end ": 99, " key ": " Social Skills ", " pct ": 87, " start ": 80, " rawScore ": 87}]	[{" q ": 1, " text ": " I can easily identify my emotions as I experience them.", " answer ": " 5 "}, {" q ": 2, " text ": " I notice physical changes (e.g., heart rate, breathing)
when my emotions shift.", " answer ": " 5 "}, {" q ": 3, " text ": " I can recognize
when my mood influences my decisions.", " answer ": " 5 "}, {" q ": 4, " text ": " I am aware of my emotional triggers.", " answer ": " 5 "}, {" q ": 5, " text ": " I reflect on how my feelings affect my behavior.", " answer ": " 5 "}, {" q ": 6, " text ": " I can explain my emotions clearly to others.", " answer ": " 5 "}, {" q ": 7, " text ": " I recognize the link between my emotions and my
values.", " answer ": " 5 "}, {" q ": 8, " text ": " I can predict how I will feel in different situations.", " answer ": " 5 "}, {" q ": 9, " text ": " I am able to evaluate my strengths accurately.", " answer ": " 5 "}, {" q ": 10, " text ": " I acknowledge my weaknesses without defensiveness.", " answer ": " 5 "}, {" q ": 11, " text ": " I understand how stress affects my emotional state.", " answer ": " 5 "}, {" q ": 12, " text ": " I am aware of how my emotions affect those around me.", " answer ": " 5 "}, {" q ": 13, " text ": " I can detect subtle changes in my mood throughout the day.", " answer ": " 3 "}, {" q ": 14, " text ": " I reflect on how my past experiences shape my emotions.", " answer ": " 1 "}, {" q ": 15, " text ": " I seek feedback to better understand how I come across emotionally.", " answer ": " 5 "}, {" q ": 16, " text ": " I know how my emotional patterns influence my relationships.", " answer ": " 5 "}, {" q ": 17, " text ": " I can differentiate between primary emotions (anger, sadness, fear, joy).", " answer ": " 4 "}, {" q ": 18, " text ": " I often journal,
    meditate,
    or reflect to track my emotions.", " answer ": " 3 "}, {" q ": 19, " text ": " I can identify whether my emotions are rational
    or impulsive.", " answer ": " 4 "}, {" q ": 20, " text ": " I reflect on how my emotions influence my daily choices.", " answer ": " 5 "}, {" q ": 21, " text ": " I stay calm under pressure.", " answer ": " 5 "}, {" q ": 22, " text ": " I avoid saying things I might later regret
    when upset.", " answer ": " 4 "}, {" q ": 23, " text ": " I can delay immediate gratification for long - term goals.", " answer ": " 3 "}, {" q ": 24, " text ": " I manage my stress effectively.", " answer ": " 3 "}, {" q ": 25, " text ": " I adapt easily to unexpected changes.", " answer ": " 3 "}, {" q ": 26, " text ": " I take ownership of my actions,
    even
    when outcomes are unfavorable.", " answer ": " 4 "}, {" q ": 27, " text ": " I recover quickly
after emotional setbacks.", " answer ": " 5 "}, {" q ": 28, " text ": " I avoid reacting impulsively
    when angry.", " answer ": " 4 "}, {" q ": 29, " text ": " I consider the consequences before making emotional decisions.", " answer ": " 5 "}, {" q ": 30, " text ": " I can manage my frustration in challenging situations.", " answer ": " 4 "}, {" q ": 31, " text ": " I am able to keep negative emotions
from overwhelming me.", " answer ": " 5 "}, {" q ": 32, " text ": " I pause
    and breathe before responding in conflict situations.", " answer ": " 4 "}, {" q ": 33, " text ": " I can control my tone
    and body language
    when irritated.", " answer ": " 5 "}, {" q ": 34, " text ": " I remain optimistic even during setbacks.", " answer ": " 4 "}, {" q ": 35, " text ": " I am open to feedback without becoming defensive.", " answer ": " 5 "}, {" q ": 36, " text ": " I recognize
    when I need rest to prevent emotional burnout.", " answer ": " 4 "}, {" q ": 37, " text ": " I regulate my emotions to maintain professionalism.", " answer ": " 5 "}, {" q ": 38, " text ": " I use relaxation techniques to manage stress.", " answer ": " 4 "}, {" q ": 39, " text ": " I am able to stay focused even
    when I feel upset.", " answer ": " 5 "}, {" q ": 40, " text ": " I practice self - control in emotionally charged situations.", " answer ": " 4 "}, {" q ": 41, " text ": " I
set personal goals
    and work persistently toward them.", " answer ": " 1 "}, {" q ": 42, " text ": " I find ways to stay engaged even in tasks that feel repetitive
    or boring.", " answer ": " 2 "}, {" q ": 43, " text ": " I maintain focus even
    when facing obstacles.", " answer ": " 3 "}, {" q ": 44, " text ": " I seek opportunities for self - improvement.", " answer ": " 4 "}, {" q ": 45, " text ": " I bounce back quickly
from failures.", " answer ": " 5 "}, {" q ": 46, " text ": " I remain optimistic about achieving my goals.", " answer ": " 4 "}, {" q ": 47, " text ": " I find purpose in what I do.", " answer ": " 3 "}, {" q ": 48, " text ": " I am passionate about achieving excellence.", " answer ": " 2 "}, {" q ": 49, " text ": " I take initiative without waiting for instructions.", " answer ": " 1 "}, {" q ": 50, " text ": " I see challenges as opportunities to grow.", " answer ": " 2 "}, {" q ": 51, " text ": " I
set high standards for my own performance.", " answer ": " 3 "}, {" q ": 52, " text ": " I am willing to put in extra effort to reach goals.", " answer ": " 4 "}, {" q ": 53, " text ": " I enjoy learning new skills.", " answer ": " 5 "}, {" q ": 54, " text ": " I stay motivated even
    when tasks are tedious.", " answer ": " 4 "}, {" q ": 55, " text ": " I celebrate small achievements along the way.", " answer ": " 3 "}, {" q ": 56, " text ": " I visualize my long - term success regularly.", " answer ": " 2 "}, {" q ": 57, " text ": " I stay focused on goals despite distractions.", " answer ": " 1 "}, {" q ": 58, " text ": " I am willing to sacrifice short - term comfort for long - term growth.", " answer ": " 5 "}, {" q ": 59, " text ": " I seek feedback to improve my performance.", " answer ": " 5 "}, {" q ": 60, " text ": " I persevere even
    when results are slow.", " answer ": " 5 "}, {" q ": 61, " text ": " I can sense
    when others are upset even if they don 't say it.", "answer": "5"}, {"q": 62, "text": "I listen attentively when someone shares their feelings.", "answer": "5"}, {"q": 63, "text": "I try to put myself in others' shoes.", " answer ": " 4 "}, {" q ": 64, " text ": " I recognize non - verbal cues such as body language
    and tone.", " answer ": " 3 "}, {" q ": 65, " text ": " I validate other people 's emotions.", "answer": "4"}, {"q": 66, "text": "I avoid judging others before understanding their perspective.", "answer": "5"}, {"q": 67, "text": "I can adapt my response based on how others feel.", "answer": "4"}, {"q": 68, "text": "I recognize when I' m emotionally overwhelmed by others ' problems and take steps to protect my well-being.", "answer": "3"}, {"q": 69, "text": "I respect cultural and emotional differences.", "answer": "4"}, {"q": 70, "text": "I make people feel heard and understood.", "answer": "5"}, {"q": 71, "text": "I recognize when my words affect others emotionally.", "answer": "4"}, {"q": 72, "text": "I am aware when someone is uncomfortable in a situation.", "answer": "5"}, {"q": 73, "text": "I show compassion to people who are struggling.", "answer": "4"}, {"q": 74, "text": "I adjust my communication style depending on who I' m speaking with.", " answer ": " 3 "}, {" q ": 75, " text ": " I am able to comfort others
    when they are distressed.", " answer ": " 2 "}, {" q ": 76, " text ": " I understand the needs of people even without being told.", " answer ": " 1 "}, {" q ": 77, " text ": " I recognize
    when someone needs space instead of comfort.", " answer ": " 2 "}, {" q ": 78, " text ": " I can anticipate how people might react emotionally.", " answer ": " 3 "}, {" q ": 79, " text ": " I take time to consider how decisions affect others.", " answer ": " 4 "}, {" q ": 80, " text ": " I respond with patience to people in emotional distress.", " answer ": " 5 "}, {" q ": 81, " text ": " I build rapport easily with new people.", " answer ": " 5 "}, {" q ": 82, " text ": " I communicate my ideas clearly
    and confidently.", " answer ": " 4 "}, {" q ": 83, " text ": " I actively listen in conversations.", " answer ": " 5 "}, {" q ": 84, " text ": " I manage conflict in a constructive way.", " answer ": " 4 "}, {" q ": 85, " text ": " I collaborate effectively in group settings.", " answer ": " 5 "}, {" q ": 86, " text ": " I maintain positive relationships even under stress.", " answer ": " 4 "}, {" q ": 87, " text ": " I can influence others without being forceful.", " answer ": " 5 "}, {" q ": 88, " text ": " I adapt my communication style to different audiences.", " answer ": " 4 "}, {" q ": 89, " text ": " I am skilled at giving constructive feedback.", " answer ": " 5 "}, {" q ": 90, " text ": " I resolve misunderstandings quickly.", " answer ": " 4 "}, {" q ": 91, " text ": " I make an effort to include others in discussions.", " answer ": " 5 "}, {" q ": 92, " text ": " I am comfortable leading group activities.", " answer ": " 4 "}, {" q ": 93, " text ": " I show appreciation for others ' contributions.", "answer": "5"}, {"q": 94, "text": "I handle criticism gracefully in social situations.", "answer": "4"}, {"q": 95, "text": "I can persuade others toward a shared vision.", "answer": "5"}, {"q": 96, "text": "I am effective at networking and building connections.", "answer": "5"}, {"q": 97, "text": "I recognize group dynamics and adjust my role as needed.", "answer": "3"}, {"q": 98, "text": "I know how to keep conversations going and make others feel comfortable in social settings.", "answer": "5"}, {"q": 99, "text": "I help mediate when others are in conflict.", "answer": "1"}, {"q": 100, "text": "I foster teamwork and cooperation among peers.", "answer": "5"}]	2025-10-21 02:57:34.731924
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, first_name, middle_name, last_name, email, password, created_at, profile_picture, password_reset_token, token_expiry, birthday, is_verified, is_archived, archived_at, last_active) FROM stdin;
53	Jesus	Morm	Christ	cafasif686@lxbeta.com	$2b$10$JNHAJ1/Mhhz1A2hevoYF8.Y9/fvBRy2VhCd2/UvxaZtqQczmdOBgi	2026-03-19 12:35:04.581996	\N	\N	\N	\N	f	t	2026-03-25 18:07:20.29319	2026-03-19 12:35:04.581996
51	Nom	Miguel	del	megleon03@gmail.com	$2b$10$1dwIM7QB1GgkbYNFAMltaegiXSxf9eXh6Q3bKax8rk97VbK6Wcm9i	2026-03-19 12:28:06.16188	\N	\N	\N	\N	f	t	2026-03-25 18:07:26.228593	2026-03-19 12:28:06.16188
50	Alfred Miguel	Masula	De Leon	yuijinshi@gmail.com	$2b$10$I9fbk.B6RIvjwCee.V2pKuvAZVUZR.KgNPRAWqc4.VgOeaGDet/Ru	2025-10-17 02:08:49.151341	\N	\N	\N	\N	t	t	2026-03-25 18:07:29.265828	2025-10-21 02:58:56.367145
52	Jesus	Morm	Christ	deleonalfredmiguel@gmail.com	$2b$10$RkZ1DaR0jkBssJRC6Gm9Q.jic7LJkGMaA65/zqwe5SFj.W2YUIfjq	2026-03-19 12:34:13.88687	\N	9301eb02ac6e7534343c88e73ec78e9b4d9440f0805d3fb99422fdf0348e9fe2	2026-03-19 12:51:52.705	\N	f	f	\N	2026-03-19 12:34:13.88687
\.


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(' public.admins_id_seq ', 1, true);


--
-- Name: contact_messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(' public.contact_messages_id_seq ', 1, false);


--
-- Name: content_article_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(' public.content_article_id_seq ', 176, true);


--
-- Name: contents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(' public.contents_id_seq ', 135, true);


--
-- Name: journal_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(' public.journal_entries_id_seq ', 1, false);


--
-- Name: results_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(' public.results_id_seq ', 61, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval(' public.users_id_seq ', 53, true);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: content_article content_article_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_article
    ADD CONSTRAINT content_article_pkey PRIMARY KEY (id);


--
-- Name: content contents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content
    ADD CONSTRAINT contents_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: results results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.results
    ADD CONSTRAINT results_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: content_article content_article_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.content_article
    ADD CONSTRAINT content_article_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.content(id) ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 8cPfJemZZeDH8KebqedfzlP9OkoafkoOffFQrrTRVNhl66PvOBJd7IEat25tuVl