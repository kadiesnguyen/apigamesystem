--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

-- Started on 2025-08-15 22:03:29

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

--
-- TOC entry 2 (class 3079 OID 16581)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5020 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 888 (class 1247 OID 16609)
-- Name: game_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.game_category AS ENUM (
    'slot',
    'table',
    'lottery'
);


ALTER TYPE public.game_category OWNER TO postgres;

--
-- TOC entry 894 (class 1247 OID 16624)
-- Name: game_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.game_status AS ENUM (
    'active',
    'inactive',
    'draft'
);


ALTER TYPE public.game_status OWNER TO postgres;

--
-- TOC entry 891 (class 1247 OID 16616)
-- Name: volatility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volatility AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE public.volatility OWNER TO postgres;

--
-- TOC entry 241 (class 1255 OID 16669)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- TOC entry 230 (class 1255 OID 16517)
-- Name: superace_user_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.superace_user_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.superace_user_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 16592)
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id bigint NOT NULL,
    refresh_hash text NOT NULL,
    user_agent text,
    ip inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);


ALTER TABLE public.admin_sessions OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16566)
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id bigint NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    email text,
    role text DEFAULT 'admin'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16565)
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_users_id_seq OWNER TO postgres;

--
-- TOC entry 5021 (class 0 OID 0)
-- Dependencies: 225
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
-- TOC entry 228 (class 1259 OID 16672)
-- Name: games; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.games (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    category public.game_category NOT NULL,
    rtp numeric(5,2) NOT NULL,
    volatility public.volatility NOT NULL,
    status public.game_status DEFAULT 'draft'::public.game_status NOT NULL,
    icon_url text,
    desc_short text,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT games_rtp_check CHECK (((rtp >= (80)::numeric) AND (rtp <= (100)::numeric)))
);


ALTER TABLE public.games OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16686)
-- Name: partner_games; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_games (
    partner_id bigint NOT NULL,
    game_id integer NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    rtp_override numeric(5,2),
    sort_order integer DEFAULT 0,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT partner_games_rtp_override_check CHECK (((rtp_override IS NULL) OR ((rtp_override >= (80)::numeric) AND (rtp_override <= (100)::numeric))))
);


ALTER TABLE public.partner_games OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16419)
-- Name: partner_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_sessions (
    id integer NOT NULL,
    partner_id character varying(100) NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.partner_sessions OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16418)
-- Name: partner_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_sessions_id_seq OWNER TO postgres;

--
-- TOC entry 5022 (class 0 OID 0)
-- Dependencies: 218
-- Name: partner_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_sessions_id_seq OWNED BY public.partner_sessions.id;


--
-- TOC entry 223 (class 1259 OID 16487)
-- Name: partner_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_users (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    username text NOT NULL,
    balance numeric(12,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    password text
);


ALTER TABLE public.partner_users OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16486)
-- Name: partner_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partner_users_id_seq OWNER TO postgres;

--
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 222
-- Name: partner_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_users_id_seq OWNED BY public.partner_users.id;


--
-- TOC entry 221 (class 1259 OID 16475)
-- Name: partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partners (
    id integer NOT NULL,
    name text NOT NULL,
    api_key text NOT NULL,
    secret_key text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.partners OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16474)
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.partners_id_seq OWNER TO postgres;

--
-- TOC entry 5024 (class 0 OID 0)
-- Dependencies: 220
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- TOC entry 224 (class 1259 OID 16504)
-- Name: superace_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.superace_user (
    user_id bigint NOT NULL,
    free_spins integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.superace_user OWNER TO postgres;

--
-- TOC entry 4805 (class 2604 OID 16569)
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- TOC entry 4795 (class 2604 OID 16422)
-- Name: partner_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_sessions ALTER COLUMN id SET DEFAULT nextval('public.partner_sessions_id_seq'::regclass);


--
-- TOC entry 4799 (class 2604 OID 16490)
-- Name: partner_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_users ALTER COLUMN id SET DEFAULT nextval('public.partner_users_id_seq'::regclass);


--
-- TOC entry 4797 (class 2604 OID 16478)
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- TOC entry 5012 (class 0 OID 16592)
-- Dependencies: 227
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_sessions (id, user_id, refresh_hash, user_agent, ip, created_at, expires_at, revoked_at) FROM stdin;
7187f77e-04cb-42ad-bc0b-ba397f2e49f3	1	397add369fda13fab1868db47707064b2fff3de39539d707b444f4631a2a18cc	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:16:14.299092+07	2025-09-14 03:16:14.299092+07	\N
492b84c1-3f9c-4596-b22c-b4876c43fbc8	1	e42a6140a2034e44d53db59e6fd087457a3fa142848c90a48116a2f17229c696	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:16:34.215988+07	2025-09-14 03:16:34.215988+07	\N
720ca904-0d87-4a51-8460-871fb0bb99e6	1	1e07eda17b7925bfc5d74efdb84744458ca7cdf9e2fc3e757d437b9aa84a6ff7	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:24:58.033378+07	2025-09-14 03:24:58.033378+07	\N
2de3f3be-d76e-402d-96a2-200f4f48f981	1	813c7a27c21d5772e3690bb36e213b09368987e9316f8abb0badafa1e013a816	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:43:50.22106+07	2025-09-14 03:43:50.22106+07	\N
978d10cd-7977-4c15-a57f-40178322a203	1	77a2357dd22c7c3736823f883a10ae20ebc6e3292bad7fdb06ad17bd9aca514e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:44:01.733037+07	2025-09-14 03:44:01.733037+07	\N
b56c6809-09de-48bf-83f5-83ee3a2fcbe0	1	d1516b567af34551312f5fcbcf496d8b86f07c3855fc8ee18c6a2d46230f0bfb	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:46:43.600704+07	2025-09-14 03:46:43.600704+07	\N
870fed7d-4e0e-4b8d-b259-996230afd0ad	1	6b0cf686b1e12b2fabc66f79580830574468c3c2b4590e86f2855e14fbe2b6c4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:51:00.795283+07	2025-09-14 03:51:00.795283+07	\N
edc490a0-6b61-43ea-af0e-5e4e7410c162	1	7e7c27e7969e5ee4f1482823f8612c0505836b9a6ceeb30396a79d36f72df597	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:51:20.856011+07	2025-09-14 03:51:20.856011+07	\N
cb221e06-9773-47ef-9d22-8e749b1422e1	1	8623a88de6dff11c5302ac304599224c1d3b3e3c88065da1025af41618eaf53b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:51:41.535975+07	2025-09-14 03:51:41.535975+07	\N
1d223ebd-e090-40f0-8ab1-93d731c84f45	1	857bb8854da3accb73dc2101d021266c3850f0ea4ca53fe765f71a19af3b5937	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:51:51.226788+07	2025-09-14 03:51:51.226788+07	\N
91a985ca-b228-41f2-a741-01847e92bdaa	1	5bebf7fc476e5627f4dcaa4543fb8a5a37db649807636d2e054c91a0b47229dd	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:52:52.553937+07	2025-09-14 03:52:52.553937+07	\N
1652d445-3846-4016-a130-3353e5a7be9d	1	2f49399067b40aa24a8cfb83c0e0dbb1296b1031aa5f5f6aba5592710c5b40bd	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:59:33.855199+07	2025-09-14 03:59:33.855199+07	\N
d8114686-6dbc-42ef-b62c-8e943c01cc50	1	4f109cf3c0945728568ec63876fc9e880db2283db83c95eaec3c43eb438b2860	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 03:59:56.188867+07	2025-09-14 03:59:56.188867+07	\N
f706ae69-6c16-4b31-aa50-f62fe34b0e6f	1	0c675883ae4fbe14983a59f388eaa2cb7820ba8899d46bd459b7392aa6528f29	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:04:08.079113+07	2025-09-14 04:04:08.079113+07	\N
e8f7592b-8ed7-41c3-9fa3-2d23a2b4f713	1	156ab45fec3c27f217a9e6ab41c2fc7876b46580fdac107bb73e9a0dd38662ff	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:08:57.870191+07	2025-09-14 04:08:57.870191+07	\N
154241a0-14a8-4c8e-a870-5dc90a715caf	1	09dcf2350074c04df5126b4acc1a9eb8e02a6c9469511da2bd0bca1239857421	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:09:19.321524+07	2025-09-14 04:09:19.321524+07	\N
a1892f80-8524-42a1-8c46-477040f8b7b9	1	0a8ae1f23398d46108cc6d9ed0b2ab48c6ffc99497c74774ac3bebec5912d3b5	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:09:34.261873+07	2025-09-14 04:09:34.261873+07	\N
b2da8e97-b737-464e-a020-8c27742f78a2	1	d8d73a65d3c4e787c97cbfae111819271c09a22bbfd0466d32f43def86b65639	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:10:01.791638+07	2025-09-14 04:10:01.791638+07	\N
104d745d-e742-4f2f-850c-e20c875c5d10	1	8d23fe43dbe72e5948ea841c2169bf63161ae6b53cb318a8cee994324a4a57ef	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:11:30.943482+07	2025-09-14 04:11:30.943482+07	\N
ef8d8405-70b2-4320-a7e6-037de1314572	1	200aeed259bd23451d50e12b2ac0fbbc672e47090496c183a42e170bdacab126	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:13:04.987573+07	2025-09-14 04:13:04.987573+07	\N
9e6e7a98-138f-4958-9ed4-1c75958f3408	1	690ae78d198ad7ce04e74827a4acbdf9824e9b630da21442858a9c0ce42c4a97	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:13:14.086475+07	2025-09-14 04:13:14.086475+07	\N
2fe5bd5e-0773-4860-8f4c-3af4cd918e68	1	b347a1b5bb84fbb19481f43218f2bc581589687d46f79641c4aad8d930c5ec81	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 04:13:58.593959+07	2025-09-14 04:13:58.593959+07	\N
3b40da8b-e430-4819-9793-3b723062fa34	1	f5006144ecf521b892810f6e00b77821d91d59159f9f25727a74861fcf1ac15d	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 15:33:24.803693+07	2025-09-14 15:33:24.803693+07	\N
86f314e1-866f-4a08-ac83-9c7db1c14076	1	57d61c68a8accd52937577ce7ae5341999ebb1e531a58d1334dc454c0afb4d39	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-15 21:36:43.214973+07	2025-09-14 21:36:43.214973+07	\N
\.


--
-- TOC entry 5011 (class 0 OID 16566)
-- Dependencies: 226
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, username, password_hash, email, role, is_active, last_login_at, created_at, updated_at) FROM stdin;
2	admin2	$2b$10$0vwVZy1OEnRj.8uRzRif7uJjwn8zD9X6nBfQy68qgJ86m4cVQ2o0W	test	superadmin	t	\N	2025-08-15 03:45:44.108829+07	2025-08-15 03:45:44.108829+07
1	admin	$2b$10$ELSP/xVjYUHYGil3WuYltukARzRjMkJOGGmew94Fi/eoc/r2DNMxG	admin@example.com	super_admin	t	2025-08-15 21:36:43.219514+07	2025-08-15 02:35:18.499583+07	2025-08-15 02:35:18.499583+07
\.


--
-- TOC entry 5013 (class 0 OID 16672)
-- Dependencies: 228
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.games (id, code, name, category, rtp, volatility, status, icon_url, desc_short, config, created_at, updated_at) FROM stdin;
1001	superace	Super Ace	slot	80.20	high	active	\N	\N	{"noWinRate": 0.2, "payoutTable": [[0, 0, 0, 0.2, 0.6, 1], [0, 0, 0, 0.3, 0.9, 1.5], [0, 0, 0, 0.4, 1.2, 2], [0, 0, 0, 0.5, 1.5, 2.5], [0, 0, 0, 0.1, 0.3, 0.5], [0, 0, 0, 0.05, 0.15, 0.25], [0, 0, 0, 0.05, 0.15, 0.25], [0, 0, 0, 0.1, 0.3, 0.5]], "goldenChance": 0.03, "redWildChance": 0.03, "scatterChance": 0.03}	2025-08-15 16:18:46.956443+07	2025-08-15 21:22:26.409963+07
\.


--
-- TOC entry 5014 (class 0 OID 16686)
-- Dependencies: 229
-- Data for Name: partner_games; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partner_games (partner_id, game_id, enabled, rtp_override, sort_order, config, updated_at) FROM stdin;
1	1001	t	96.50	0	{"bet": {"max": 200, "min": 0.2}}	2025-08-15 16:18:46.956443+07
\.


--
-- TOC entry 5004 (class 0 OID 16419)
-- Dependencies: 219
-- Data for Name: partner_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partner_sessions (id, partner_id, token, expires_at, created_at) FROM stdin;
1	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzNjk2NiwiZXhwIjoxNzUzMDQ0MTY2fQ.b_FeHBXyN5IU0-KZOIJiUqncstVXamlaGl3bOi4eFu8	2025-07-21 03:42:46.022	2025-07-21 01:42:46.023343
2	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzODYyNiwiZXhwIjoxNzUzMDQ1ODI2fQ.5Buwgj0dB8ftHH0rBWSIpnoNyzRPsmp9oVYDc6Tw82c	2025-07-21 04:10:26.494	2025-07-21 02:10:26.494663
3	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTE1MCwiZXhwIjoxNzUzMDQ2MzUwfQ.wsPt9iuHx_CeSVXrcXIxFLq2N-F1ripOoEq8DPc7QqE	2025-07-21 04:19:10.961	2025-07-21 02:19:10.96258
4	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTE1MywiZXhwIjoxNzUzMDQ2MzUzfQ.JNpysJHufwfec00QjQHNO8qi7lmhrp7yHvzMF_DIBJU	2025-07-21 04:19:13.36	2025-07-21 02:19:13.360705
5	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTI3MywiZXhwIjoxNzUzMDQ2NDczfQ.VSKNt93q1KY2rF9Z4gqGsxeV6Qovi3TEjF3sPm66Sy0	2025-07-21 04:21:13.892	2025-07-21 02:21:13.893515
6	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTM2OCwiZXhwIjoxNzUzMDQ2NTY4fQ.zmJou6S1yqyiOx6Hl0z-KnjhKF2bFUIoH_crfW7251U	2025-07-21 04:22:48.617	2025-07-21 02:22:48.617875
7	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDE2MywiZXhwIjoxNzUzMDUxMzYzfQ.PELgswNTJggnnv78PAl1DjlwoK8nIU7fR6DUDQB2aY4	2025-07-21 05:42:43.773	2025-07-21 03:42:43.774318
8	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDQwMCwiZXhwIjoxNzUzMDUxNjAwfQ.27oje--ma39UyvslBtwyz07oM6gN5v70YGHhrv0wL5k	2025-07-21 05:46:40.998	2025-07-21 03:46:40.998549
9	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDgzMiwiZXhwIjoxNzUzMDUyMDMyfQ.51bhzlOE8A_WeaFhnLy4Cc9LImGBDvhnR3rQb1bd6PQ	2025-07-21 05:53:52.147	2025-07-21 03:53:52.148049
10	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDgzNiwiZXhwIjoxNzUzMDUyMDM2fQ.UwsDqsLFj_AJfFgJ2EZJWV4TbPu6_jcfGdHkEX9K8mY	2025-07-21 05:53:56.878	2025-07-21 03:53:56.878948
11	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDkwOCwiZXhwIjoxNzUzMDUyMTA4fQ.G4qR3OXZlyZckr-Z3Dc1-61O8Rb0Ml1r0-3fqQGJYwo	2025-07-21 05:55:08.198	2025-07-21 03:55:08.199889
12	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk1NiwiZXhwIjoxNzUzMDUyMTU2fQ.oAre_hh2_9aGzUjdhMqZC8OE7vvclem8UVjQ6MaE_OY	2025-07-21 05:55:56.12	2025-07-21 03:55:56.122962
13	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk4MCwiZXhwIjoxNzUzMDUyMTgwfQ.fgNqJwzeRK5g-gx05qLq32fuWZ6111sJNsx504Ou0pM	2025-07-21 05:56:20.765	2025-07-21 03:56:20.766773
14	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk4MywiZXhwIjoxNzUzMDUyMTgzfQ._DhJ3Y56E-im-Dgj80uRSahlM0azTxO9C5efK4dX_Uc	2025-07-21 05:56:23.422	2025-07-21 03:56:23.422885
15	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk5OCwiZXhwIjoxNzUzMDUyMTk4fQ.Z-b-lHfoltJARqLpDFrmf6lYzRDnJTFjRtU8XRKXi4k	2025-07-21 05:56:38.053	2025-07-21 03:56:38.055887
16	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTA0MywiZXhwIjoxNzUzMDUyMjQzfQ.kQ05f_TuDl6C6ruDQe32afHIWKkeW8Pm16NXZNCk-b0	2025-07-21 05:57:23.051	2025-07-21 03:57:23.0516
17	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTA3MiwiZXhwIjoxNzUzMDUyMjcyfQ.DE1_rwxOfgT5EPvcS4Q4I50jxUXostyzS0anx7Tv-hU	2025-07-21 05:57:52.794	2025-07-21 03:57:52.79478
18	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTU3OCwiZXhwIjoxNzUzMDUyNzc4fQ.0jcU_qDcJxLhONpnxTUNp-K8Y0QA0cFAx5LSdqH3k8I	2025-07-21 06:06:18.034	2025-07-21 04:06:18.035232
19	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTU4MiwiZXhwIjoxNzUzMDUyNzgyfQ._LFbAdLLejuCHQdp5d7EfM46qlN30w6dDKNXbDbZA1o	2025-07-21 06:06:22.114	2025-07-21 04:06:22.114933
20	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTU4MiwiZXhwIjoxNzUzMDUyNzgyfQ._LFbAdLLejuCHQdp5d7EfM46qlN30w6dDKNXbDbZA1o	2025-07-21 06:06:22.827	2025-07-21 04:06:22.82807
21	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTc5MCwiZXhwIjoxNzUzMDUyOTkwfQ.-ECL7nHOG7vsPYEqmc4CQ-RmzwXyh9df4I8hMsOetSk	2025-07-21 06:09:50.911	2025-07-21 04:09:50.912548
22	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTc5MSwiZXhwIjoxNzUzMDUyOTkxfQ.hi31h3IP_2qG6J4i3jWpkvZj41FZaEacTW_YF2X_Tlg	2025-07-21 06:09:51.838	2025-07-21 04:09:51.838826
23	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NjA5NCwiZXhwIjoxNzUzMDUzMjk0fQ.Gl5OCkDP_PFpkefulb354AOzxBCxeFjt_fdotFr0HOA	2025-07-21 06:14:54.799	2025-07-21 04:14:54.799758
24	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NjgyMiwiZXhwIjoxNzUzMDU0MDIyfQ.AeyytQATxsUS7MYOYL04srnw8H_fDU0MCtjTV8EoK2M	2025-07-21 06:27:02.784	2025-07-21 04:27:02.784643
25	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0Nzg0MSwiZXhwIjoxNzUzMDU1MDQxfQ.52NUhalNndbDsYsEGtLiLD7OzesUawjHcDjSmOhRcyg	2025-07-21 06:44:01.24	2025-07-21 04:44:01.240728
\.


--
-- TOC entry 5008 (class 0 OID 16487)
-- Dependencies: 223
-- Data for Name: partner_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partner_users (id, partner_id, username, balance, created_at, password) FROM stdin;
12	1	testuser1	7906.15	2025-07-25 05:00:08.245818	$2b$10$ELSP/xVjYUHYGil3WuYltukARzRjMkJOGGmew94Fi/eoc/r2DNMxG
\.


--
-- TOC entry 5006 (class 0 OID 16475)
-- Dependencies: 221
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partners (id, name, api_key, secret_key, created_at) FROM stdin;
1	Partner ABC	partner_abc	74286262f408	2025-07-24 17:54:52.077589
\.


--
-- TOC entry 5009 (class 0 OID 16504)
-- Dependencies: 224
-- Data for Name: superace_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.superace_user (user_id, free_spins, created_at, updated_at) FROM stdin;
12	0	2025-07-26 21:39:53.594801+07	2025-07-28 01:06:12.041566+07
\.


--
-- TOC entry 5025 (class 0 OID 0)
-- Dependencies: 225
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 2, true);


--
-- TOC entry 5026 (class 0 OID 0)
-- Dependencies: 218
-- Name: partner_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partner_sessions_id_seq', 25, true);


--
-- TOC entry 5027 (class 0 OID 0)
-- Dependencies: 222
-- Name: partner_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partner_users_id_seq', 12, true);


--
-- TOC entry 5028 (class 0 OID 0)
-- Dependencies: 220
-- Name: partners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partners_id_seq', 1, true);


--
-- TOC entry 4841 (class 2606 OID 16600)
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4836 (class 2606 OID 16577)
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- TOC entry 4838 (class 2606 OID 16579)
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- TOC entry 4845 (class 2606 OID 16685)
-- Name: games games_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_code_key UNIQUE (code);


--
-- TOC entry 4847 (class 2606 OID 16683)
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- TOC entry 4851 (class 2606 OID 16697)
-- Name: partner_games partner_games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_games
    ADD CONSTRAINT partner_games_pkey PRIMARY KEY (partner_id, game_id);


--
-- TOC entry 4824 (class 2606 OID 16427)
-- Name: partner_sessions partner_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_sessions
    ADD CONSTRAINT partner_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4830 (class 2606 OID 16498)
-- Name: partner_users partner_users_partner_id_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_users
    ADD CONSTRAINT partner_users_partner_id_username_key UNIQUE (partner_id, username);


--
-- TOC entry 4832 (class 2606 OID 16496)
-- Name: partner_users partner_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_users
    ADD CONSTRAINT partner_users_pkey PRIMARY KEY (id);


--
-- TOC entry 4826 (class 2606 OID 16485)
-- Name: partners partners_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_api_key_key UNIQUE (api_key);


--
-- TOC entry 4828 (class 2606 OID 16483)
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- TOC entry 4834 (class 2606 OID 16511)
-- Name: superace_user superace_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.superace_user
    ADD CONSTRAINT superace_user_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4842 (class 1259 OID 16607)
-- Name: idx_admin_sessions_expires; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_sessions_expires ON public.admin_sessions USING btree (expires_at);


--
-- TOC entry 4843 (class 1259 OID 16606)
-- Name: idx_admin_sessions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_sessions_user_id ON public.admin_sessions USING btree (user_id);


--
-- TOC entry 4839 (class 1259 OID 16580)
-- Name: idx_admin_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_username ON public.admin_users USING btree (username);


--
-- TOC entry 4848 (class 1259 OID 16708)
-- Name: idx_games_config_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_config_gin ON public.games USING gin (config);


--
-- TOC entry 4849 (class 1259 OID 16709)
-- Name: idx_partner_games_config_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_partner_games_config_gin ON public.partner_games USING gin (config);


--
-- TOC entry 4822 (class 1259 OID 16433)
-- Name: idx_partner_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_partner_token ON public.partner_sessions USING btree (partner_id, token);


--
-- TOC entry 4857 (class 2620 OID 16518)
-- Name: superace_user trg_superace_user_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_superace_user_updated BEFORE UPDATE ON public.superace_user FOR EACH ROW EXECUTE FUNCTION public.superace_user_set_updated_at();


--
-- TOC entry 4854 (class 2606 OID 16601)
-- Name: admin_sessions admin_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- TOC entry 4855 (class 2606 OID 16703)
-- Name: partner_games partner_games_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_games
    ADD CONSTRAINT partner_games_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- TOC entry 4856 (class 2606 OID 16698)
-- Name: partner_games partner_games_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_games
    ADD CONSTRAINT partner_games_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- TOC entry 4852 (class 2606 OID 16499)
-- Name: partner_users partner_users_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_users
    ADD CONSTRAINT partner_users_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- TOC entry 4853 (class 2606 OID 16512)
-- Name: superace_user superace_user_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.superace_user
    ADD CONSTRAINT superace_user_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.partner_users(id);


-- Completed on 2025-08-15 22:03:29

--
-- PostgreSQL database dump complete
--

