--
-- PostgreSQL database dump
--

\restrict GmmKN8mRPORJUcH8f2dF4KFHyg9chbYT27X3jdfemakN7a5vArcwvMFZqH47nXa

-- Dumped from database version 14.20 (Ubuntu 14.20-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.20 (Ubuntu 14.20-0ubuntu0.22.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: game_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.game_category AS ENUM (
    'slot',
    'table',
    'lottery'
);


ALTER TYPE public.game_category OWNER TO postgres;

--
-- Name: game_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.game_status AS ENUM (
    'active',
    'inactive',
    'draft'
);


ALTER TYPE public.game_status OWNER TO postgres;

--
-- Name: volatility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.volatility AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE public.volatility OWNER TO postgres;

--
-- Name: fn_acc_partner_match(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_acc_partner_match() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE p_partner INT;
BEGIN
  SELECT partner_id INTO p_partner FROM players WHERE id = NEW.player_id;
  IF p_partner IS NULL THEN
    RAISE EXCEPTION 'Player % not found', NEW.player_id;
  END IF;
  IF NEW.partner_id IS DISTINCT FROM p_partner THEN
    RAISE EXCEPTION 'partner_id mismatch: account.partner_id=%, player.partner_id=%',
      NEW.partner_id, p_partner;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_acc_partner_match() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: sp_deposit(bigint, numeric, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_deposit(p_account_id bigint, p_amount numeric, p_ref_id character varying DEFAULT NULL::character varying, p_meta jsonb DEFAULT NULL::jsonb) RETURNS TABLE(balance_after numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE v_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount phải > 0'; END IF;

  UPDATE player_accounts
  SET balance = balance + p_amount
  WHERE id = p_account_id
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN RAISE EXCEPTION 'Account % không tồn tại', p_account_id; END IF;

  INSERT INTO account_ledger(account_id, ref_type, ref_id, amount, balance_after, meta)
  VALUES (p_account_id, 'deposit', p_ref_id, p_amount, v_balance, p_meta);

  balance_after := v_balance; RETURN;
END;
$$;


ALTER FUNCTION public.sp_deposit(p_account_id bigint, p_amount numeric, p_ref_id character varying, p_meta jsonb) OWNER TO postgres;

--
-- Name: sp_ensure_game_account(bigint, integer, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_ensure_game_account(p_player_id bigint, p_game_id integer, p_username character varying DEFAULT NULL::character varying, p_currency character varying DEFAULT 'VND'::character varying) RETURNS TABLE(account_id bigint)
    LANGUAGE plpgsql
    AS $$
DECLARE v_partner_id INT;
BEGIN
  SELECT partner_id INTO v_partner_id FROM players WHERE id = p_player_id AND active = TRUE;
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'Player % không tồn tại hoặc không active', p_player_id;
  END IF;

  -- Nếu tồn tại → trả về, nếu chưa → tạo mới
  INSERT INTO player_accounts(player_id, game_id, partner_id, username, currency)
  VALUES (p_player_id, p_game_id, v_partner_id, COALESCE(p_username, ''), p_currency)
  ON CONFLICT (game_id, partner_id, username) DO NOTHING;

  SELECT id INTO account_id
  FROM player_accounts
  WHERE player_id = p_player_id AND game_id = p_game_id AND partner_id = v_partner_id
  ORDER BY id DESC
  LIMIT 1;

  IF account_id IS NULL THEN
    -- fallback: với UNIQUE (game_id, partner_id, username) có thể cần username không rỗng
    RAISE EXCEPTION 'Không thể tạo/tìm account: cần username cho game_id=% partner_id=%', p_game_id, v_partner_id;
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION public.sp_ensure_game_account(p_player_id bigint, p_game_id integer, p_username character varying, p_currency character varying) OWNER TO postgres;

--
-- Name: sp_hold(bigint, numeric, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_hold(p_account_id bigint, p_stake numeric, p_round_id character varying, p_meta jsonb DEFAULT NULL::jsonb) RETURNS TABLE(balance_after numeric, locked_after numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE v_balance NUMERIC; v_locked NUMERIC;
BEGIN
  IF p_stake <= 0 THEN RAISE EXCEPTION 'Stake phải > 0'; END IF;

  UPDATE player_accounts
  SET balance = balance - p_stake,
      locked_balance = locked_balance + p_stake
  WHERE id = p_account_id AND balance >= p_stake
  RETURNING balance, locked_balance INTO v_balance, v_locked;

  IF NOT FOUND THEN RAISE EXCEPTION 'Số dư không đủ để hold'; END IF;

  INSERT INTO account_ledger(account_id, ref_type, ref_id, amount, balance_after, meta)
  VALUES (p_account_id, 'hold', p_round_id, -p_stake, v_balance, p_meta);

  balance_after := v_balance; locked_after := v_locked; RETURN;
END;
$$;


ALTER FUNCTION public.sp_hold(p_account_id bigint, p_stake numeric, p_round_id character varying, p_meta jsonb) OWNER TO postgres;

--
-- Name: sp_login_player(integer, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_login_player(p_partner_id integer, p_username character varying, p_password_plain character varying) RETURNS TABLE(player_id bigint, active boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE v_hash VARCHAR;
BEGIN
  SELECT id, password_hash, active
  INTO player_id, v_hash, active
  FROM players
  WHERE partner_id = p_partner_id AND username = p_username;

  IF player_id IS NULL THEN
    RAISE EXCEPTION 'Sai thông tin đăng nhập' USING ERRCODE = '28P01';
  END IF;

  IF crypt(p_password_plain, v_hash) <> v_hash THEN
    RAISE EXCEPTION 'Sai mật khẩu' USING ERRCODE = '28P01';
  END IF;

  IF active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Tài khoản bị khóa';
  END IF;

  RETURN;
END;
$$;


ALTER FUNCTION public.sp_login_player(p_partner_id integer, p_username character varying, p_password_plain character varying) OWNER TO postgres;

--
-- Name: sp_register_player(integer, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_register_player(p_partner_id integer, p_username character varying, p_password_hash character varying) RETURNS TABLE(player_id bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO players(partner_id, username, password_hash, active)
  VALUES (p_partner_id, p_username, p_password_hash, TRUE)
  RETURNING id INTO player_id;
  RETURN;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Username "%" đã tồn tại trong partner %', p_username, p_partner_id
    USING ERRCODE = 'unique_violation';
END;
$$;


ALTER FUNCTION public.sp_register_player(p_partner_id integer, p_username character varying, p_password_hash character varying) OWNER TO postgres;

--
-- Name: sp_release_only(bigint, character varying, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_release_only(p_account_id bigint, p_round_id character varying, p_stake numeric, p_meta jsonb DEFAULT NULL::jsonb) RETURNS TABLE(balance_after numeric, locked_after numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE v_balance NUMERIC; v_locked NUMERIC;
BEGIN
  UPDATE player_accounts
  SET locked_balance = locked_balance - p_stake,
      balance = balance + p_stake
  WHERE id = p_account_id AND locked_balance >= p_stake
  RETURNING balance, locked_balance INTO v_balance, v_locked;

  IF NOT FOUND THEN RAISE EXCEPTION 'locked_balance không đủ để release'; END IF;

  INSERT INTO account_ledger(account_id, ref_type, ref_id, amount, balance_after, meta)
  VALUES (p_account_id, 'release', p_round_id, 0, v_balance, p_meta);

  balance_after := v_balance; locked_after := v_locked; RETURN;
END;
$$;


ALTER FUNCTION public.sp_release_only(p_account_id bigint, p_round_id character varying, p_stake numeric, p_meta jsonb) OWNER TO postgres;

--
-- Name: sp_settle(bigint, character varying, numeric, numeric, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_settle(p_account_id bigint, p_round_id character varying, p_stake numeric, p_payout numeric, p_meta jsonb DEFAULT NULL::jsonb) RETURNS TABLE(balance_after numeric, locked_after numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE v_balance NUMERIC; v_locked NUMERIC;
BEGIN
  IF p_stake < 0 OR p_payout < 0 THEN RAISE EXCEPTION 'stake/payout phải >= 0'; END IF;

  -- Nhả tiền giữ
  UPDATE player_accounts
  SET locked_balance = locked_balance - p_stake
  WHERE id = p_account_id AND locked_balance >= p_stake
  RETURNING balance, locked_balance INTO v_balance, v_locked;

  IF NOT FOUND THEN RAISE EXCEPTION 'locked_balance không đủ để release'; END IF;

  -- Ghi bet âm + cộng payout dương trên balance
  UPDATE player_accounts
  SET balance = balance - p_stake + p_payout
  WHERE id = p_account_id
  RETURNING balance, locked_balance INTO v_balance, v_locked;

  -- Ledger: bet và win
  INSERT INTO account_ledger(account_id, ref_type, ref_id, amount, balance_after, meta)
  VALUES
    (p_account_id, 'bet', p_round_id, -p_stake, v_balance - p_payout, p_meta),
    (p_account_id, 'win', p_round_id,  p_payout, v_balance, p_meta);

  balance_after := v_balance; locked_after := v_locked; RETURN;
END;
$$;


ALTER FUNCTION public.sp_settle(p_account_id bigint, p_round_id character varying, p_stake numeric, p_payout numeric, p_meta jsonb) OWNER TO postgres;

--
-- Name: sp_withdraw(bigint, numeric, character varying, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sp_withdraw(p_account_id bigint, p_amount numeric, p_ref_id character varying DEFAULT NULL::character varying, p_meta jsonb DEFAULT NULL::jsonb) RETURNS TABLE(balance_after numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE v_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount phải > 0'; END IF;

  UPDATE player_accounts
  SET balance = balance - p_amount
  WHERE id = p_account_id AND balance >= p_amount
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN RAISE EXCEPTION 'Số dư không đủ'; END IF;

  INSERT INTO account_ledger(account_id, ref_type, ref_id, amount, balance_after, meta)
  VALUES (p_account_id, 'withdraw', p_ref_id, -p_amount, v_balance, p_meta);

  balance_after := v_balance; RETURN;
END;
$$;


ALTER FUNCTION public.sp_withdraw(p_account_id bigint, p_amount numeric, p_ref_id character varying, p_meta jsonb) OWNER TO postgres;

--
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
-- Name: account_ledger; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.account_ledger (
    id bigint NOT NULL,
    account_id bigint NOT NULL,
    ref_type character varying(16) NOT NULL,
    ref_id character varying(64),
    amount numeric(20,2) NOT NULL,
    balance_after numeric(20,2) NOT NULL,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.account_ledger OWNER TO postgres;

--
-- Name: account_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.account_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.account_ledger_id_seq OWNER TO postgres;

--
-- Name: account_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.account_ledger_id_seq OWNED BY public.account_ledger.id;


--
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
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
    id bigint NOT NULL,
    username text NOT NULL,
    display_name text,
    email text,
    password_hash text NOT NULL,
    role text NOT NULL,
    partner_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    timezone text DEFAULT 'GMT+7'::text NOT NULL,
    language text DEFAULT 'vi'::text NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_admin_users_partner_consistency CHECK ((((role = 'partner'::text) AND (partner_id IS NOT NULL)) OR ((role = ANY (ARRAY['admin'::text, 'superadmin'::text])) AND (partner_id IS NULL)))),
    CONSTRAINT chk_admin_users_role CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'partner'::text])))
);


ALTER TABLE public.admin_users OWNER TO postgres;

--
-- Name: admin_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admin_users_id_seq OWNER TO postgres;

--
-- Name: admin_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;


--
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
-- Name: partner_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partner_sessions (
    id integer NOT NULL,
    partner_id character varying(100) NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    used boolean DEFAULT false
);


ALTER TABLE public.partner_sessions OWNER TO postgres;

--
-- Name: partner_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partner_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.partner_sessions_id_seq OWNER TO postgres;

--
-- Name: partner_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partner_sessions_id_seq OWNED BY public.partner_sessions.id;


--
-- Name: partners; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.partners (
    id integer NOT NULL,
    name text NOT NULL,
    api_key text NOT NULL,
    secret_key text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.partners OWNER TO postgres;

--
-- Name: partners_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.partners_id_seq OWNER TO postgres;

--
-- Name: partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;


--
-- Name: player_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.player_accounts (
    id bigint NOT NULL,
    player_id bigint NOT NULL,
    game_id integer NOT NULL,
    partner_id integer NOT NULL,
    username character varying(64) NOT NULL,
    currency character varying(8) DEFAULT 'VND'::character varying NOT NULL,
    balance numeric(20,2) DEFAULT 0 NOT NULL,
    locked_balance numeric(20,2) DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    free_spins integer DEFAULT 0
);


ALTER TABLE public.player_accounts OWNER TO postgres;

--
-- Name: player_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.player_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.player_accounts_id_seq OWNER TO postgres;

--
-- Name: player_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.player_accounts_id_seq OWNED BY public.player_accounts.id;


--
-- Name: players; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.players (
    id bigint NOT NULL,
    partner_id integer NOT NULL,
    username character varying(64) NOT NULL,
    password_hash character varying(255) NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.players OWNER TO postgres;

--
-- Name: players_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.players_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.players_id_seq OWNER TO postgres;

--
-- Name: players_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.players_id_seq OWNED BY public.players.id;


--
-- Name: account_ledger id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_ledger ALTER COLUMN id SET DEFAULT nextval('public.account_ledger_id_seq'::regclass);


--
-- Name: admin_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users ALTER COLUMN id SET DEFAULT nextval('public.admin_users_id_seq'::regclass);


--
-- Name: partner_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_sessions ALTER COLUMN id SET DEFAULT nextval('public.partner_sessions_id_seq'::regclass);


--
-- Name: partners id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners ALTER COLUMN id SET DEFAULT nextval('public.partners_id_seq'::regclass);


--
-- Name: player_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_accounts ALTER COLUMN id SET DEFAULT nextval('public.player_accounts_id_seq'::regclass);


--
-- Name: players id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players ALTER COLUMN id SET DEFAULT nextval('public.players_id_seq'::regclass);


--
-- Data for Name: account_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.account_ledger (id, account_id, ref_type, ref_id, amount, balance_after, meta, created_at) FROM stdin;
1	3	deposit	cms-dep:51:1755378634592	50.00	50.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:10:34.619036+07
2	3	deposit	cms-dep:51:1755378639327	50.00	100.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:10:39.331798+07
3	3	deposit	cms-dep:51:1755378641389	50.00	150.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:10:41.393875+07
4	3	deposit	cms-dep:51:1755378645941	50.00	200.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:10:45.944603+07
5	3	deposit	cms-dep:51:1755378851565	60.00	260.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:14:11.589784+07
6	3	withdraw	cms-wd:51:1755378870835	-10.00	250.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 04:14:30.86437+07
7	3	deposit	1	50.00	300.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:15:31.711635+07
8	3	deposit	cms-dep:51:1755379055997	1.00	301.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:17:36.004148+07
9	3	deposit	cms-dep:51:1755379159339	11.00	312.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:19:19.35202+07
10	3	deposit	cms-dep:51:1755379253070	1.00	313.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:20:53.09599+07
11	3	deposit	cms-dep:51:1755379850288	1.00	314.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:30:50.297006+07
12	3	deposit	cms-dep:51:1755379872681	1.00	315.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:31:12.718187+07
13	3	deposit	cms-dep:51:1755379879765	1.00	316.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:31:19.772296+07
14	3	deposit	cms-dep:51:1755379925070	1.00	317.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:32:05.107863+07
15	3	deposit	cms-dep:51:1755379932692	1.00	318.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:32:12.702447+07
16	3	deposit	cms-dep:51:1755380022368	1.00	319.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:33:42.3766+07
17	3	deposit	cms-dep:51:1755380099011	1.00	320.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:34:59.046324+07
18	3	withdraw	cms-wd:51:1755380124951	-1.00	319.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 04:35:24.987872+07
19	3	deposit	cms-dep:51:1755380130401	1.00	320.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:35:30.410548+07
20	3	deposit	cms-dep:51:1755380137862	1.00	321.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:35:37.867201+07
21	3	deposit	cms-dep:51:1755380268653	1.00	322.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:37:48.661412+07
22	3	deposit	cms-dep:51:1755380272785	11.00	333.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:37:52.793827+07
23	3	deposit	cms-dep:51:1755380331472	1.00	334.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:38:51.476567+07
24	3	deposit	cms-dep:51:1755380356466	1.00	335.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:39:16.475203+07
25	3	deposit	cms-dep:51:1755380375843	1.00	336.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:39:35.854202+07
26	3	deposit	cms-dep:51:1755381147762	1.00	337.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:52:27.769832+07
27	3	deposit	cms-dep:51:1755381154289	2.00	339.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:52:34.298832+07
28	3	deposit	cms-dep:51:1755381316784	1.00	340.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:55:16.793464+07
29	3	deposit	cms-dep:51:1755381341590	1.00	341.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:55:41.598374+07
30	3	deposit	cms-dep:51:1755381347934	1.00	342.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:55:47.946899+07
31	3	deposit	cms-dep:51:1755381365986	1.00	343.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:56:05.992019+07
32	3	deposit	cms-dep:51:1755381383022	2.00	345.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:56:23.030724+07
33	3	deposit	cms-dep:51:1755381425083	5.00	350.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:57:05.109322+07
34	3	deposit	cms-dep:51:1755381508617	1.00	351.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:58:28.627789+07
35	3	deposit	cms-dep:51:1755381555692	1.00	352.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:59:15.699626+07
36	3	deposit	cms-dep:51:1755381559876	1.00	353.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:59:19.883091+07
37	3	deposit	cms-dep:51:1755381579160	1.00	354.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:59:39.166264+07
38	3	deposit	cms-dep:51:1755381587554	1.00	355.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 04:59:47.563008+07
39	3	deposit	cms-dep:51:1755381656100	1.00	356.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:00:56.107518+07
40	3	withdraw	cms-wd:51:1755381663476	-2.00	354.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:01:03.484221+07
41	3	deposit	cms-dep:51:1755381811383	1.00	355.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:03:31.391802+07
42	3	deposit	cms-dep:51:1755381816060	1.00	356.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:03:36.066136+07
43	3	deposit	cms-dep:51:1755381889622	1.00	357.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:04:49.630673+07
44	3	deposit	cms-dep:51:1755381893608	1.00	358.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:04:53.617015+07
45	3	deposit	cms-dep:51:1755381898919	5.00	363.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:04:58.928391+07
46	3	deposit	cms-dep:51:1755381917907	1.00	364.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:05:17.916974+07
47	3	deposit	cms-dep:51:1755381924273	1.00	365.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:05:24.282078+07
48	3	deposit	cms-dep:51:1755381935345	1.00	366.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:05:35.350131+07
49	3	deposit	cms-dep:51:1755381941065	1.00	367.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:05:41.069444+07
50	3	deposit	cms-dep:51:1755381947768	1.00	368.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:05:47.772802+07
51	3	deposit	cms-dep:51:1755381956519	1.00	369.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:05:56.529358+07
52	3	deposit	cms-dep:51:1755381963893	1.00	370.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:06:03.898519+07
53	3	deposit	cms-dep:51:1755381970106	1.00	371.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:06:10.116706+07
54	3	withdraw	cms-wd:51:1755382069486	-1.00	370.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:07:49.49085+07
55	3	withdraw	cms-wd:51:1755382090257	-1.00	369.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:08:10.26261+07
56	3	withdraw	cms-wd:51:1755382093321	-4.00	365.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:08:13.326916+07
57	3	deposit	cms-dep:51:1755382096023	5.00	370.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:08:16.030565+07
58	3	deposit	cms-dep:51:1755382104205	1.00	371.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:08:24.210594+07
59	3	deposit	cms-dep:51:1755382115192	1.00	372.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:08:35.197222+07
60	3	withdraw	cms-wd:51:1755382241130	-1.00	371.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:10:41.135711+07
61	3	deposit	cms-dep:51:1755382276241	1.00	372.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:11:16.247986+07
62	3	withdraw	cms-wd:51:1755382279582	-5.00	367.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:11:19.590218+07
63	3	withdraw	cms-wd:51:1755382283219	-111.00	256.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:11:23.222813+07
64	3	deposit	cms-dep:51:1755382732114	50.00	306.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:18:52.137972+07
65	3	deposit	cms-dep:51:1755382917677	1.00	307.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:21:57.688058+07
66	3	deposit	cms-dep:51:1755382984460	1.00	308.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:23:04.472313+07
67	3	withdraw	cms-wd:51:1755382991445	-2.00	306.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:23:11.450156+07
68	3	deposit	cms-dep:51:1755383070677	1.00	307.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:24:30.715759+07
69	3	deposit	cms-dep:51:1755383076857	1.00	308.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:24:36.862736+07
70	3	withdraw	cms-wd:51:1755383087608	-1.00	307.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:24:47.615257+07
71	3	deposit	cms-dep:51:1755383124415	1.00	308.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 05:25:24.426762+07
72	3	withdraw	cms-wd:51:1755383768904	-308.00	0.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 05:36:08.913042+07
73	3	deposit	cms-dep:51:1755385975590	500.00	500.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 06:12:55.605766+07
74	3	withdraw	cms-wd:51:1755386002753	-1.00	481.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 06:13:22.788574+07
75	3	withdraw	cms-wd:51:1755386020672	-1.00	480.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 06:13:40.697708+07
76	3	deposit	cms-dep:51:1755386027249	11.00	491.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 06:13:47.253784+07
77	3	deposit	cms-dep:51:1755416019137	1.00	501.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 14:33:39.150095+07
78	3	deposit	cms-dep:51:1755416023769	55.00	556.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-08-17 14:33:43.776476+07
79	3	withdraw	cms-wd:51:1755416477519	-111.00	445.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 14:41:17.529916+07
80	3	withdraw	cms-wd:51:1755416483919	-111.00	334.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36", "reason": "CMS withdraw", "source": "cms", "adminId": "1"}	2025-08-17 14:41:23.928524+07
81	6	deposit	cms-dep:51:1762844706201	100000.00	100000.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-11-11 14:05:07.81546+07
83	14	deposit	cms-dep:51:1764579325985	1000.00	1000.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-12-01 15:55:26.066872+07
84	16	deposit	cms-dep:67:1764827795980	100000.00	100000.00	{"ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-12-04 12:56:40.24426+07
85	17	deposit	cms-dep:67:1764924230670	1000000.00	1000000.00	{"ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-12-05 15:43:50.944558+07
86	21	deposit	cms-dep:76:1765264980025	10000.00	10000.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-12-09 14:23:00.590667+07
87	22	deposit	cms-dep:77:1765270613962	10000.00	10000.00	{"ua": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", "reason": "CMS deposit", "source": "cms", "adminId": "1"}	2025-12-09 15:56:54.504114+07
\.


--
-- Data for Name: admin_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_sessions (id, user_id, refresh_hash, user_agent, ip, created_at, expires_at, revoked_at) FROM stdin;
f18049b7-4dac-4031-9421-0ff59026a2bf	1	f82baeadf3d586a15d0f345af87af03fbbdd4f2690e100d01d00725a7173d318	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 01:15:29.1195+07	2025-09-16 01:15:29.1195+07	2025-08-17 02:52:02.640251+07
c6f4f036-3a5f-4010-b252-3b57d86f4bef	1	53926762a515799a978840d3fb410844c42577955bbb491b08a124d4ba3c8a46	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 02:52:02.641714+07	2025-08-24 02:52:02.641714+07	\N
1bf0608d-cce9-444d-814a-4c4e9b5e7fda	1	9248682f8cc7d438014891d75eec68d0366fb9944d488d848d48f7101d09f091	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 02:55:13.158567+07	2025-09-16 02:55:13.158567+07	\N
3ea10810-fee1-456c-b2f5-7a807d2c41d4	1	bba9a03ebb4dff00a94b8509ad2504256689b6be87a4cd15d8b90d5ed8ccb091	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 03:16:22.53877+07	2025-09-16 03:16:22.53877+07	\N
f0058cfe-75a1-4ac3-9605-804970174dda	1	e1083dc50163816b823558069c35b6f9723fd87591232476b5f49feac32de354	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 03:32:28.590737+07	2025-09-16 03:32:28.590737+07	2025-08-17 04:33:02.337123+07
38002dfc-b329-4e55-9130-3a42cb2dcc8d	1	f63d78f171e4c8ba35c5e6b74bc133b77ce057bfe5f8411a7d0055e728e8160b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 04:33:02.339112+07	2025-08-24 04:33:02.339112+07	\N
a3221e19-e230-4601-bf48-56b80ff0de88	1	becf276b70a61da7873d5ecdf13d17ddd183f13eefa8f21b79c4d0e01e6f455e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 04:33:33.277362+07	2025-09-16 04:33:33.277362+07	2025-08-17 05:34:05.374724+07
ee3ccc1f-22a1-4dd7-916d-5fab34a6058d	1	b585fc15d3985da5440075f66c545a797866e11c46656cd4df8073af17c67df6	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 05:34:05.376716+07	2025-08-24 05:34:05.376716+07	\N
1c1bdd4b-7ad9-463c-8d1f-d3322e77b8b5	1	05042572729e4db81917da86f9a52e61f020feceee0d13b92ea27da66877c530	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 05:34:05.37632+07	2025-08-24 05:34:05.37632+07	\N
41ceae05-46bd-4177-b4b8-bf4d538b8206	1	9da937c7f6aa27ace235978e9b97bea711a07a9518c4217e8b0ef74ce4487cc8	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 05:34:19.343849+07	2025-09-16 05:34:19.343849+07	2025-08-17 06:34:22.997616+07
45053257-7091-4ebd-82e6-c9bb94363a01	1	3347ea8728a528f19a68628116066e6940179deeb842986b19acb97d0adf5fd3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 06:34:22.998961+07	2025-08-24 06:34:22.998961+07	\N
a97e0639-da1c-4cea-9adb-e369daaaf8d4	1	e913e5be4339f0a4fcc9451010f5188c20ceea08f0e09887e606ed0dd9100063	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 06:34:22.999055+07	2025-08-24 06:34:22.999055+07	\N
a5314547-b1cc-4d57-b095-03c9f0117d68	1	bebb4a5925d291f13d8b2e88e53343c37904bbe3f22067bd77ffb680242c9489	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 06:34:50.137394+07	2025-09-16 06:34:50.137394+07	\N
62707454-d95a-4219-afed-78e54f8dcc47	1	54f784a97d00334f9d1cdc93e1570ce60d0f25d96f56d4308f97ff5a616a9bd4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 13:51:48.554472+07	2025-09-16 13:51:48.554472+07	2025-08-17 16:26:05.645905+07
419c5f10-c6a1-4746-9646-094ce31aa6e3	1	8ece093effc3b2f0850d93c45de5a24597febea7e7c44e3cd6c9cf4fba1feba4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 16:26:05.648858+07	2025-08-24 16:26:05.648858+07	\N
eff0d39c-ee27-43e9-a80a-9a654ee3be01	1	b27e3c902ccdca7978f584635046c3306e5ae70fad000e8f5a6d953574e83862	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-17 22:54:21.324054+07	2025-09-16 22:54:21.324054+07	2025-08-18 00:45:14.449076+07
3a89815e-dbef-40e7-b7b8-7aff10c59752	1	3f47d1ce0805695ba30dc2adf8c80e0823da66aec0b84ae630a48add9402a71b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-18 00:45:14.450397+07	2025-08-25 00:45:14.450397+07	\N
74dc1161-3424-4f1c-bd4e-4683f4fcc5b7	1	3c0ed2f9048b5ad8b63218bdf78f8b96e25d5b2dea17d854ae6f59cc1d2292b2	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36	\N	2025-08-18 00:45:25.553173+07	2025-09-17 00:45:25.553173+07	\N
74c822b5-1896-471c-888c-40ef32ec0d1a	1	1dac1ede20e2a8998871df1a7a5d9a272d96f6b0ce8b18da8de991667bae92f5	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36	\N	2025-11-05 07:43:35.28498+07	2025-12-05 07:43:35.28498+07	\N
ac645071-1753-43c4-bac7-757c75b99fc2	1	e819555f17e4b3ca54909c216b3086f229d09f37f27863684afc924bc7e1440b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-10 10:19:25.740311+07	2025-12-10 10:19:25.740311+07	\N
b78c0e07-e417-40bb-957f-7595459534d0	1	e1ee21abd33292dea6226e353a6ad308c2e5ad532edfb4cf8d356e8ed33f84cc	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-10 10:19:49.138862+07	2025-12-10 10:19:49.138862+07	\N
dac1bb0d-b392-4ce1-b39e-cf5acc010ae0	1	d8cdf58a82c4724bf2bd951a32e791ea94fa2fb6b5939b56a21b21e91124a201	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0	\N	2025-11-10 14:46:16.452869+07	2025-12-10 14:46:16.452869+07	\N
f45d0ff9-cb42-4205-90c0-242841dcdf15	1	0ab8a28c000d4c67ffa8241d67d59d1b337089267d1f5b12e35545895552a05c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-10 18:29:57.880066+07	2025-12-10 18:29:57.880066+07	\N
7fedfefc-ece0-4607-bf6d-7fcaa9efba34	1	34b3d4b69a5960a7c6552654992c4ae9962feeef8d2f09883b5b5f8ad867c1a5	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-11 11:52:06.847219+07	2025-12-11 11:52:06.847219+07	\N
c04a6e0e-c1f6-4981-8ba5-b9b6b344b93f	1	c2dcd4d3bfee5b136fa41a73d98579437e300c4a4dcbdba8ada33a14cec6fb83	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-11 13:17:27.678683+07	2025-12-11 13:17:27.678683+07	\N
7e2233ae-030f-4202-8386-148f6747653d	1	81b9d2e1a8bab736167512679bf2462ebb9ed93e78d75d60d4270d51d0b72445	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-11 14:03:11.953301+07	2025-12-11 14:03:11.953301+07	\N
5ca391e7-500e-4cc2-8781-ef0323a6da32	1	0efbdcd0a27e8e004428e0d973b5874f1b07f10876db98299ad7e32a9cc51714	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-13 09:44:54.12661+07	2025-12-13 09:44:54.12661+07	\N
45c3e0ad-70e2-4619-9ed9-19547eb2c04e	1	46f4f841380683fd8f206a1b208cf0966020ea3af1dc49dda4436aeeb0be4b9a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-14 10:27:52.403269+07	2025-12-14 10:27:52.403269+07	\N
66c51391-c936-4d1d-b897-4f8f3d9271c9	1	36de1e0a1f0a7c617c9860cddf3599db180f352d73706d51a0018594a9991bc9	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-23 12:48:35.616278+07	2025-12-23 12:48:35.616278+07	\N
f620b1bb-19a2-42bc-810f-5e41b8d34cd5	1	b80fd2342dfc2328ff73fae0af988e54c6c915cbc609eda8645772cd3e97cbd3	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-24 14:34:41.224053+07	2025-12-24 14:34:41.224053+07	\N
5cb74d10-4e82-4ac5-8b1a-ba350d137c6e	1	0282080c73262e47da0be6718637ffc6a3bc3a113f5e703a0ee74834345af02a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-24 14:34:53.316741+07	2025-12-24 14:34:53.316741+07	\N
73f38a24-f63f-47cb-a163-7fe34cb18d54	1	ea7f3f105d987a340b8cfd5626c680dd8aec15b716a0aee99677364de17c4a7e	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-25 00:44:06.772853+07	2025-12-25 00:44:06.772853+07	\N
8e54a10b-4c50-47c4-98e0-4519b4c3b2ee	1	8e00ef5e09d9b9fd019bd8f84bbff041dbb5fa5b85c9ed641251e3a73ec8f54a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-25 07:13:13.540092+07	2025-12-25 07:13:13.540092+07	\N
b95237b3-00b5-4869-bf05-7f8c4e833eb0	1	efb8dea6a4854d21be68e39fc959812fc366c216600a59d941b5b46829ab94f7	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-25 07:25:58.399275+07	2025-12-25 07:25:58.399275+07	\N
62a773b5-3f6e-4cc3-bb48-fb07f53809f3	1	937694d329b2d175c7496130b1498525084fc726816591ab3b9ae3738ba1069c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-25 07:26:45.201+07	2025-12-25 07:26:45.201+07	\N
7977d62f-df86-4d23-9c5a-3d625a8599b4	1	c37d0674ab2df6aef184b0bb1f982eb9a89b96167945a9113cd8ca1cab8f1781	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-25 15:47:16.622519+07	2025-12-25 15:47:16.622519+07	\N
f0c5bc19-b785-4390-a25b-8c722c3c481c	1	92d44a246f8e407667c146043d2327ae1e103b4082f5a7700ec76e2b5ef4c63a	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-25 15:52:14.773573+07	2025-12-25 15:52:14.773573+07	\N
6e48bb7d-1e01-4e35-8e69-9c349dd65c97	1	b98abc5d7093358d3955674fa5d85a2e1f51de414c245670468cb3ec0797072c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-25 15:56:22.991277+07	2025-12-25 15:56:22.991277+07	\N
c3cb4504-a64f-4c1a-a63e-ba5c019af20e	1	c94efbc50ebd45b42abe0aa0bc8fb187de7053e7c3d015a5f60f61bf2681cf3c	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-26 10:13:42.067272+07	2025-12-26 10:13:42.067272+07	\N
559cd90f-a6cc-488f-8cff-b0c77e78c00f	1	b13c0150393efc047d2ab18ab450ad8176520ff01885f637884d306d53a9dee1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-28 14:17:13.838931+07	2025-12-28 14:17:13.838931+07	\N
25a6cf93-1df3-4bed-bcf7-d4967b08c802	1	6f2d62e3a753fb390af354ac6ebae5c842acf658a50f98ef1a8ee4290c5f71cc	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-28 14:48:25.394153+07	2025-12-28 14:48:25.394153+07	\N
2bb3a435-c423-4c4d-850a-4cddead99ecd	1	34f8469eb64208e9655256285ac24c1167fea1b1662f855e1928f08a8c325908	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-28 16:28:58.491817+07	2025-12-28 16:28:58.491817+07	\N
0eb8d04d-ade8-40b8-bb36-5838d7508d8b	1	ca700939611f4ac4953c4c778567f2ed8cf675d557387f61528e465a3a24468f	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-11-29 12:01:40.039556+07	2025-12-29 12:01:40.039556+07	\N
537bd809-7204-4e81-a105-f5a64cf30f0d	1	d692de262b80f6983a4aae5d3e9fa873b02022423c43855f0e67f903bb13c7bd	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-12-01 15:16:04.231574+07	2025-12-31 15:16:04.231574+07	\N
eeddbc51-717b-4a37-89c9-fc4107bb88f5	1	8b022b5ac05431fda9cdb5323ba2bc62266cdc55ca8897c0325c67ca35b59abe	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-12-04 10:11:22.182894+07	2026-01-03 10:11:22.182894+07	\N
535ad6af-209e-40a9-bf60-1eaed881fc4b	1	bef18bf1f70162267ca491022cf5ce5cb0e232929aa72b39801f177e4a83ee7b	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-12-04 10:11:49.927829+07	2026-01-03 10:11:49.927829+07	\N
bb6fabf7-9e85-4b18-9e9f-75187e8d884f	1	0a1a9c1035a18e1137b8c8559b7308bc22b98c1bb4fd5efa3660d0fe81bd4c80	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0	\N	2025-12-04 10:19:37.885431+07	2026-01-03 10:19:37.885431+07	\N
51c0200d-2be0-46f5-8dd9-79a57b5729fa	1	782bcf61a4bc87833b104d0a414a99b5a262f8f217bbd738149e163af8d27582	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1	\N	2025-12-04 12:54:19.725796+07	2026-01-03 12:54:19.725796+07	\N
64407e1e-c8e3-4eb8-90f3-97939aa217c8	1	1386b61fd030c3b398a52d27f572c8dfd6c8e570420046551d7a607f4fe29878	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15	\N	2025-12-04 12:56:14.802365+07	2026-01-03 12:56:14.802365+07	\N
2e61efc2-126a-46d0-b375-469daaec7c0e	1	dd5b1da5c21ed374bf81055c1ae5ae6cc867848c330400545d57fa67c46da51e	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15	\N	2025-12-05 15:43:13.462883+07	2026-01-04 15:43:13.462883+07	\N
27f4e787-b24c-4ca2-9951-b358b52dc654	1	b3743ba488e656ec23bcd9214a7b3fcf5e92247655f22fb9ac56e9be3c5408a4	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-12-09 14:17:36.143935+07	2026-01-08 14:17:36.143935+07	\N
e667b5c3-9b63-4781-b561-91c9d74a8bcd	1	15bd2439cca5ee2bfaad8233924729d95559595d2b6714cc0cc09e47962816e1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-12-09 14:19:02.889272+07	2026-01-08 14:19:02.889272+07	\N
813c5ed4-7fa8-4dd9-bfaf-302580f9bd82	1	5ba4637dbab5d0f9d91a6e27e058c474066bc4a21464abb3718d360b4ea33915	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-12-09 14:22:37.69299+07	2026-01-08 14:22:37.69299+07	\N
e70de701-f7e3-4f8c-894e-5202fb3fa8bc	1	47db90c34bd1749c292bfa730af07aad9bf3a40ec3de6a51c0294a6648704a38	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36	\N	2025-12-09 15:56:41.960256+07	2026-01-08 15:56:41.960256+07	\N
1d7a1296-0fdb-4b79-bc10-f023b6dad55f	1	2acaab088f1131e6e75ea5c6df888d685ae1b5468eed834353fcee1e28f85ff1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36	\N	2025-12-13 10:50:36.572329+07	2026-01-12 10:50:36.572329+07	\N
\.


--
-- Data for Name: admin_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_users (id, username, display_name, email, password_hash, role, partner_id, is_active, timezone, language, last_login_at, created_at, updated_at) FROM stdin;
1	admin	Super Administrator	admin@example.com	$2a$10$mlg39cP5lMuJ.jbrECNPZeZV6IYok.Mf2kFUPCW.lA/Y8Y1AIqqOW	superadmin	\N	t	GMT+7	vi	2025-12-13 10:50:36.581882+07	2025-08-17 01:02:29.053211+07	2025-12-13 10:50:36.581882+07
\.


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.games (id, code, name, category, rtp, volatility, status, icon_url, desc_short, config, created_at, updated_at) FROM stdin;
1001	superace	Super Ace	slot	80.20	high	active	\N	\N	{"noWinRate": 0.259, "payoutTable": [[0, 0, 0, 0.2, 0.6, 1], [0, 0, 0, 0.3, 0.9, 1.5], [0, 0, 0, 0.4, 1.2, 2], [0, 0, 0, 0.5, 1.5, 2.5], [0, 0, 0, 0.1, 0.3, 0.5], [0, 0, 0, 0.05, 0.15, 0.25], [0, 0, 0, 0.05, 0.15, 0.25], [0, 0, 0, 0.1, 0.3, 0.5]], "goldenChance": 0.373, "redWildChance": 0.03, "scatterChance": 0.02}	2025-08-15 16:18:46.956443+07	2025-08-18 01:11:20.992706+07
1003	mahjongway	Majong Way	slot	80.10	medium	draft	\N	\N	{"baseBet": 20, "noWinRate": 0.259, "payoutTable": [[12, 60, 100, 0, 0, 0], [10, 40, 80, 0, 0, 0], [8, 20, 60, 0, 0, 0], [6, 15, 40, 0, 0, 0], [4, 10, 20, 0, 0, 0], [3, 10, 20, 0, 0, 0], [2, 5, 10, 0, 0, 0], [2, 5, 10, 0, 0, 0]], "goldenChance": 0.373, "redWildChance": 0.03, "scatterChance": 0.02}	2025-11-11 14:03:50.846435+07	2025-11-23 13:06:24.093793+07
1002	mahjongway2	Majong Way 2	slot	96.50	high	active	\N	\N	{"baseBet": 20, "noWinRate": 0.259, "payoutTable": [[12, 60, 100, 0, 0, 0], [10, 40, 80, 0, 0, 0], [8, 20, 60, 0, 0, 0], [6, 15, 40, 0, 0, 0], [4, 10, 20, 0, 0, 0], [3, 10, 20, 0, 0, 0], [2, 5, 10, 0, 0, 0], [2, 5, 10, 0, 0, 0]], "goldenChance": 0.373, "scatterChance": 0.02}	2025-12-01 15:18:41.174452+07	2025-12-01 15:18:41.174452+07
\.


--
-- Data for Name: partner_games; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partner_games (partner_id, game_id, enabled, rtp_override, sort_order, config, updated_at) FROM stdin;
1	1001	t	96.50	0	{"bet": {"max": 200, "min": 0.2}}	2025-08-15 16:18:46.956443+07
\.


--
-- Data for Name: partner_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partner_sessions (id, partner_id, token, expires_at, created_at, used) FROM stdin;
1	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzNjk2NiwiZXhwIjoxNzUzMDQ0MTY2fQ.b_FeHBXyN5IU0-KZOIJiUqncstVXamlaGl3bOi4eFu8	2025-07-21 03:42:46.022	2025-07-21 01:42:46.023343	f
2	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzODYyNiwiZXhwIjoxNzUzMDQ1ODI2fQ.5Buwgj0dB8ftHH0rBWSIpnoNyzRPsmp9oVYDc6Tw82c	2025-07-21 04:10:26.494	2025-07-21 02:10:26.494663	f
3	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTE1MCwiZXhwIjoxNzUzMDQ2MzUwfQ.wsPt9iuHx_CeSVXrcXIxFLq2N-F1ripOoEq8DPc7QqE	2025-07-21 04:19:10.961	2025-07-21 02:19:10.96258	f
4	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTE1MywiZXhwIjoxNzUzMDQ2MzUzfQ.JNpysJHufwfec00QjQHNO8qi7lmhrp7yHvzMF_DIBJU	2025-07-21 04:19:13.36	2025-07-21 02:19:13.360705	f
5	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTI3MywiZXhwIjoxNzUzMDQ2NDczfQ.VSKNt93q1KY2rF9Z4gqGsxeV6Qovi3TEjF3sPm66Sy0	2025-07-21 04:21:13.892	2025-07-21 02:21:13.893515	f
6	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzAzOTM2OCwiZXhwIjoxNzUzMDQ2NTY4fQ.zmJou6S1yqyiOx6Hl0z-KnjhKF2bFUIoH_crfW7251U	2025-07-21 04:22:48.617	2025-07-21 02:22:48.617875	f
7	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDE2MywiZXhwIjoxNzUzMDUxMzYzfQ.PELgswNTJggnnv78PAl1DjlwoK8nIU7fR6DUDQB2aY4	2025-07-21 05:42:43.773	2025-07-21 03:42:43.774318	f
8	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDQwMCwiZXhwIjoxNzUzMDUxNjAwfQ.27oje--ma39UyvslBtwyz07oM6gN5v70YGHhrv0wL5k	2025-07-21 05:46:40.998	2025-07-21 03:46:40.998549	f
9	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDgzMiwiZXhwIjoxNzUzMDUyMDMyfQ.51bhzlOE8A_WeaFhnLy4Cc9LImGBDvhnR3rQb1bd6PQ	2025-07-21 05:53:52.147	2025-07-21 03:53:52.148049	f
10	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDgzNiwiZXhwIjoxNzUzMDUyMDM2fQ.UwsDqsLFj_AJfFgJ2EZJWV4TbPu6_jcfGdHkEX9K8mY	2025-07-21 05:53:56.878	2025-07-21 03:53:56.878948	f
11	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDkwOCwiZXhwIjoxNzUzMDUyMTA4fQ.G4qR3OXZlyZckr-Z3Dc1-61O8Rb0Ml1r0-3fqQGJYwo	2025-07-21 05:55:08.198	2025-07-21 03:55:08.199889	f
12	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk1NiwiZXhwIjoxNzUzMDUyMTU2fQ.oAre_hh2_9aGzUjdhMqZC8OE7vvclem8UVjQ6MaE_OY	2025-07-21 05:55:56.12	2025-07-21 03:55:56.122962	f
13	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk4MCwiZXhwIjoxNzUzMDUyMTgwfQ.fgNqJwzeRK5g-gx05qLq32fuWZ6111sJNsx504Ou0pM	2025-07-21 05:56:20.765	2025-07-21 03:56:20.766773	f
14	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk4MywiZXhwIjoxNzUzMDUyMTgzfQ._DhJ3Y56E-im-Dgj80uRSahlM0azTxO9C5efK4dX_Uc	2025-07-21 05:56:23.422	2025-07-21 03:56:23.422885	f
15	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NDk5OCwiZXhwIjoxNzUzMDUyMTk4fQ.Z-b-lHfoltJARqLpDFrmf6lYzRDnJTFjRtU8XRKXi4k	2025-07-21 05:56:38.053	2025-07-21 03:56:38.055887	f
16	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTA0MywiZXhwIjoxNzUzMDUyMjQzfQ.kQ05f_TuDl6C6ruDQe32afHIWKkeW8Pm16NXZNCk-b0	2025-07-21 05:57:23.051	2025-07-21 03:57:23.0516	f
17	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTA3MiwiZXhwIjoxNzUzMDUyMjcyfQ.DE1_rwxOfgT5EPvcS4Q4I50jxUXostyzS0anx7Tv-hU	2025-07-21 05:57:52.794	2025-07-21 03:57:52.79478	f
18	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTU3OCwiZXhwIjoxNzUzMDUyNzc4fQ.0jcU_qDcJxLhONpnxTUNp-K8Y0QA0cFAx5LSdqH3k8I	2025-07-21 06:06:18.034	2025-07-21 04:06:18.035232	f
19	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTU4MiwiZXhwIjoxNzUzMDUyNzgyfQ._LFbAdLLejuCHQdp5d7EfM46qlN30w6dDKNXbDbZA1o	2025-07-21 06:06:22.114	2025-07-21 04:06:22.114933	f
20	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTU4MiwiZXhwIjoxNzUzMDUyNzgyfQ._LFbAdLLejuCHQdp5d7EfM46qlN30w6dDKNXbDbZA1o	2025-07-21 06:06:22.827	2025-07-21 04:06:22.82807	f
21	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTc5MCwiZXhwIjoxNzUzMDUyOTkwfQ.-ECL7nHOG7vsPYEqmc4CQ-RmzwXyh9df4I8hMsOetSk	2025-07-21 06:09:50.911	2025-07-21 04:09:50.912548	f
22	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NTc5MSwiZXhwIjoxNzUzMDUyOTkxfQ.hi31h3IP_2qG6J4i3jWpkvZj41FZaEacTW_YF2X_Tlg	2025-07-21 06:09:51.838	2025-07-21 04:09:51.838826	f
23	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NjA5NCwiZXhwIjoxNzUzMDUzMjk0fQ.Gl5OCkDP_PFpkefulb354AOzxBCxeFjt_fdotFr0HOA	2025-07-21 06:14:54.799	2025-07-21 04:14:54.799758	f
24	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0NjgyMiwiZXhwIjoxNzUzMDU0MDIyfQ.AeyytQATxsUS7MYOYL04srnw8H_fDU0MCtjTV8EoK2M	2025-07-21 06:27:02.784	2025-07-21 04:27:02.784643	f
25	partner_abc	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXJ0bmVySWQiOiJwYXJ0bmVyX2FiYyIsImlhdCI6MTc1MzA0Nzg0MSwiZXhwIjoxNzUzMDU1MDQxfQ.52NUhalNndbDsYsEGtLiLD7OzesUawjHcDjSmOhRcyg	2025-07-21 06:44:01.24	2025-07-21 04:44:01.240728	f
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.partners (id, name, api_key, secret_key, created_at, active) FROM stdin;
1	Partner ABC	partner_abc	74286262f408	2025-07-24 17:54:52.077589	t
2	Partner Test	partner_test	test_secret_2025	2025-08-17 02:02:48.08103	t
\.


--
-- Data for Name: player_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.player_accounts (id, player_id, game_id, partner_id, username, currency, balance, locked_balance, active, created_at, free_spins) FROM stdin;
11	61	1003	1	yudbe	VND	0.00	0.00	t	2025-11-30 12:34:41.842585+07	0
3	51	1001	1	testuser1	VND	4313.25	0.00	t	2025-08-17 02:39:23.612699+07	10
20	75	1002	1	checkgame1	VND	0.00	0.00	t	2025-12-09 13:54:21.288142+07	0
15	66	1002	1	partner_abc	VND	0.00	0.00	t	2025-12-04 12:28:29.529965+07	0
6	51	1003	1	testuser1	VND	824692.80	0.00	t	2025-11-11 14:04:10.998163+07	0
14	51	1002	1	testuser1	VND	423208.80	0.00	t	2025-12-01 15:55:16.142972+07	0
22	77	1002	1	checkgame2	VND	311163.00	0.00	t	2025-12-09 15:55:50.400464+07	24
10	60	1003	1	test1231	VND	0.00	0.00	t	2025-11-29 13:15:15.698078+07	0
16	67	1002	1	perfectsun	VND	2754468.00	0.00	t	2025-12-04 12:30:38.929811+07	38
21	76	1003	1	partner_abc2	VND	15143.80	0.00	t	2025-12-09 14:21:28.857319+07	0
18	69	1002	1	egantest	VND	0.00	0.00	t	2025-12-06 13:08:32.293259+07	0
17	67	1003	1	perfectsun	VND	1051274.50	0.00	t	2025-12-05 15:43:37.898082+07	0
19	73	1002	1	perfectsun2	VND	0.00	0.00	t	2025-12-09 11:13:51.016172+07	0
7	52	1003	1	testuser122	VND	0.00	0.00	t	2025-11-28 14:37:09.715906+07	0
8	53	1003	1	testuser166	VND	0.00	0.00	t	2025-11-28 15:34:19.153404+07	0
9	56	1003	1	test123	VND	0.00	0.00	t	2025-11-28 15:48:02.866029+07	0
\.


--
-- Data for Name: players; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.players (id, partner_id, username, password_hash, active, created_at) FROM stdin;
52	1	testuser122	$2b$10$dc9i9VA0UiD.UsLbdKGEwer2CHyJa7EJNd6iqq1jncKTYxBDNAj9W	t	2025-11-28 14:37:09.715906+07
53	1	testuser166	$2b$10$6B6gJ0sZV2JmzZIccvP/t.xL0t5VI8sSbcLHqJFkYeg5zze0uE1ce	t	2025-11-28 15:34:19.153404+07
56	1	test123	$2b$10$/x0VL9lrUoNGZdabep/pkOGV7OxGUfQfD8RfKwIKrOaGxjlMDteAq	t	2025-11-28 15:48:02.866029+07
60	1	test1231	$2b$10$i4jiUAJTtqm0ZQuYwVbahe/6cnghq9IIgcFBFl1fmjG34DH/444Ae	t	2025-11-29 13:15:15.698078+07
61	1	yudbe	$2b$10$OamoM7Lb15N13vleTZvW0uLYxlY9pv0lVHECbaVZmP803KXZ63qjS	t	2025-11-30 12:34:41.842585+07
62	1	usertest1	$2b$10$PVmSpezRJjdArxyKq2gd.OwLsjKVSgDV/sGzgYLkG9ZPk19u9dMSq	t	2025-12-01 15:29:39.183721+07
51	1	testuser1	$2b$10$n3ni4ng1j/mQyFYwoAhGiO1DPXJPhuwIfbAdjTGxieNvBnTNJ/afO	t	2025-08-17 02:39:23.612699+07
66	1	partner_abc	$2b$10$4xkB5UN0pZmlcyP1d882..PuBkiB8zsg9K2uH/X.XHOKnCEmwXPaC	t	2025-12-04 12:28:29.529965+07
67	1	perfectsun	$2b$10$6Rt/3GQHMEGi12sBWNLw0ONIFjrRnbKcJFveB70Kr./rpP9QNOioK	t	2025-12-04 12:30:38.929811+07
69	1	egantest	$2b$10$Uhnxng1YtebW7LMJRGTiLeoqWFfEjYCD5YyppeTFVCfXcrBpnMdNy	t	2025-12-06 13:08:32.293259+07
73	1	perfectsun2	$2b$10$du6uD5MRIEe.zcmISG4pre9pdtgTaIoiKTs40krualdMzHcBFJcim	t	2025-12-09 11:13:51.016172+07
75	1	checkgame1	$2b$10$2aa2NWR4/zglDhHTyQw2lOsObgem6v8JJZqbwJXtmvIyHlT87vaya	t	2025-12-09 13:54:21.288142+07
76	1	partner_abc2	$2b$10$7TdfZzJDXIb0JFHCca2KnesT3qK572o/4yvNPSD4nI1L8YFTTKDvW	t	2025-12-09 14:21:28.857319+07
77	1	checkgame2	$2b$10$ua3x7K7r..xk4LSJ3XlyAeb9Im3lOllRD6T8yUNxvmQXEgpdUtf9y	t	2025-12-09 15:55:50.400464+07
\.


--
-- Name: account_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.account_ledger_id_seq', 87, true);


--
-- Name: admin_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.admin_users_id_seq', 1, true);


--
-- Name: partner_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partner_sessions_id_seq', 25, true);


--
-- Name: partners_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.partners_id_seq', 2, true);


--
-- Name: player_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.player_accounts_id_seq', 22, true);


--
-- Name: players_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.players_id_seq', 77, true);


--
-- Name: account_ledger account_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_ledger
    ADD CONSTRAINT account_ledger_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- Name: games games_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_code_key UNIQUE (code);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: partner_games partner_games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_games
    ADD CONSTRAINT partner_games_pkey PRIMARY KEY (partner_id, game_id);


--
-- Name: partner_sessions partner_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_sessions
    ADD CONSTRAINT partner_sessions_pkey PRIMARY KEY (id);


--
-- Name: partners partners_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_api_key_key UNIQUE (api_key);


--
-- Name: partners partners_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partners
    ADD CONSTRAINT partners_pkey PRIMARY KEY (id);


--
-- Name: player_accounts player_accounts_game_id_partner_id_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_accounts
    ADD CONSTRAINT player_accounts_game_id_partner_id_username_key UNIQUE (game_id, partner_id, username);


--
-- Name: player_accounts player_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_accounts
    ADD CONSTRAINT player_accounts_pkey PRIMARY KEY (id);


--
-- Name: players players_partner_id_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_partner_id_username_key UNIQUE (partner_id, username);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_users_partner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_admin_users_partner_id ON public.admin_users USING btree (partner_id);


--
-- Name: idx_games_config_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_games_config_gin ON public.games USING gin (config);


--
-- Name: idx_partner_games_config_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_partner_games_config_gin ON public.partner_games USING gin (config);


--
-- Name: idx_partner_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_partner_token ON public.partner_sessions USING btree (partner_id, token);


--
-- Name: ix_acc_game; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_acc_game ON public.player_accounts USING btree (game_id);


--
-- Name: ix_acc_partner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_acc_partner ON public.player_accounts USING btree (partner_id);


--
-- Name: ix_acc_player; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_acc_player ON public.player_accounts USING btree (player_id);


--
-- Name: ix_ledger_acc_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_acc_time ON public.account_ledger USING btree (account_id, created_at DESC);


--
-- Name: ix_ledger_ref; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ledger_ref ON public.account_ledger USING btree (ref_type, ref_id);


--
-- Name: player_accounts trg_acc_partner_match; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_acc_partner_match BEFORE INSERT OR UPDATE ON public.player_accounts FOR EACH ROW EXECUTE FUNCTION public.fn_acc_partner_match();


--
-- Name: admin_users trg_admin_users_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_admin_users_set_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: account_ledger account_ledger_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.account_ledger
    ADD CONSTRAINT account_ledger_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.player_accounts(id) ON DELETE CASCADE;


--
-- Name: admin_users admin_users_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;


--
-- Name: admin_users fk_admin_users_partner_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT fk_admin_users_partner_id FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE SET NULL;


--
-- Name: partner_games partner_games_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_games
    ADD CONSTRAINT partner_games_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: partner_games partner_games_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.partner_games
    ADD CONSTRAINT partner_games_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: player_accounts player_accounts_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_accounts
    ADD CONSTRAINT player_accounts_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: player_accounts player_accounts_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_accounts
    ADD CONSTRAINT player_accounts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: player_accounts player_accounts_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.player_accounts
    ADD CONSTRAINT player_accounts_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: players players_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE;


--
-- Name: TABLE account_ledger; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.account_ledger TO gameserver;


--
-- Name: SEQUENCE account_ledger_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.account_ledger_id_seq TO gameserver;


--
-- Name: TABLE admin_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_sessions TO gameserver;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_users TO gameserver;


--
-- Name: SEQUENCE admin_users_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.admin_users_id_seq TO gameserver;


--
-- Name: TABLE games; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.games TO gameserver;


--
-- Name: TABLE partner_games; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.partner_games TO gameserver;


--
-- Name: TABLE partner_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.partner_sessions TO gameserver;


--
-- Name: SEQUENCE partner_sessions_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.partner_sessions_id_seq TO gameserver;


--
-- Name: TABLE partners; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.partners TO gameserver;


--
-- Name: SEQUENCE partners_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.partners_id_seq TO gameserver;


--
-- Name: TABLE player_accounts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.player_accounts TO gameserver;


--
-- Name: SEQUENCE player_accounts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.player_accounts_id_seq TO gameserver;


--
-- Name: TABLE players; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.players TO gameserver;


--
-- Name: SEQUENCE players_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.players_id_seq TO gameserver;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO gameserver;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO gameserver;


--
-- PostgreSQL database dump complete
--

\unrestrict GmmKN8mRPORJUcH8f2dF4KFHyg9chbYT27X3jdfemakN7a5vArcwvMFZqH47nXa

