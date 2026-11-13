--
-- PostgreSQL database dump
--

\restrict voWeqAOtjad3UOKnsU9GSpiVUllKeMybz2HwCpDioPLHGdsAaO0boV1jUmTIXef

-- Dumped from database version 16.16
-- Dumped by pg_dump version 16.16

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
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bookings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "seatCode" character varying NOT NULL,
    "userId" character varying NOT NULL,
    status character varying DEFAULT 'PENDING'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bookings OWNER TO postgres;

--
-- Name: seats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.seats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "seatCode" character varying NOT NULL,
    status character varying DEFAULT 'AVAILABLE'::character varying NOT NULL,
    "lockedBy" character varying,
    "lockedUntil" timestamp without time zone
);


ALTER TABLE public.seats OWNER TO postgres;

--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bookings (id, "seatCode", "userId", status, "createdAt") FROM stdin;
78cffabf-12c8-49ce-9dba-3ceab45f8e7c	A1	user_01	PENDING	2026-11-13 04:09:01.818394
c2427d9f-a430-4222-811d-0200bfc76142	A2	user_01	PENDING	2026-11-13 04:10:56.044706
affce53b-ee8e-4c2f-bd0d-f3c9960d5b31	A10	user_01	PENDING	2026-11-13 04:14:43.444348
eaecda59-958c-48a5-a87b-cb1402228da2	A9	user_01	PENDING	2026-11-13 04:14:49.095644
e295f4a1-1768-4362-bb64-b62585cc5bd8	A4	user_02	PENDING	2026-11-13 04:15:02.977863
\.


--
-- Data for Name: seats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.seats (id, "seatCode", status, "lockedBy", "lockedUntil") FROM stdin;
07269c12-e101-4bd4-991b-c96fe02dda45	A3	AVAILABLE	\N	\N
d1272576-0739-41da-a8b2-a8eb0c76ccab	A5	AVAILABLE	\N	\N
7525833f-f4a4-4d89-ac2d-3f3b52b4b2c6	A6	AVAILABLE	\N	\N
7358c084-9982-45ef-bcaf-415da87036dc	A7	AVAILABLE	\N	\N
5b187365-7042-47ca-af55-ce888e2c535f	A8	AVAILABLE	\N	\N
bb4b132a-4f76-4653-9651-05b03ec8de3a	A1	AVAILABLE	\N	\N
4334f192-a103-4409-9ca2-ae2ada14a0af	A2	BOOKED	\N	\N
4107aca2-8dfa-4627-a6f8-e3f9d2d73883	A10	BOOKED	user_01	\N
e225f205-ea5c-4199-aa1b-fe4dbb6b1608	A9	BOOKED	user_01	\N
07d3e669-cc84-4e0b-be41-ba53e4ffe869	A4	BOOKED	user_02	\N
\.


--
-- Name: seats PK_3fbc74bb4638600c506dcb777a7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT "PK_3fbc74bb4638600c506dcb777a7" PRIMARY KEY (id);


--
-- Name: bookings PK_bee6805982cc1e248e94ce94957; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY (id);


--
-- Name: seats UQ_79e99279181112f93219722934a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.seats
    ADD CONSTRAINT "UQ_79e99279181112f93219722934a" UNIQUE ("seatCode");


--
-- PostgreSQL database dump complete
--

\unrestrict voWeqAOtjad3UOKnsU9GSpiVUllKeMybz2HwCpDioPLHGdsAaO0boV1jUmTIXef

