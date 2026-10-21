'use client';
import { useState } from 'react';
import Image from 'next/image';
import { createAuthClient } from 'better-auth/react';
import { ArrowRight,CalendarDays,Eye,EyeOff,LockKeyhole,Mail,MapPinned,Network,ShieldCheck,UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import styles from './login.module.css';
const auth=createAuthClient();
export default function Login(){
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[visible,setVisible]=useState(false);
 return <main id="conteudo" tabIndex={-1} className={styles.screen}>
  <section className={styles.brand} aria-label="CONECTA 2028, gestão comunitária de Xexéu">
   <div className={styles.logo}><Image src="/branding/logo-minguinho-transparente.png" alt="Minguinho — O Neto de Zé Leandro" width={1080} height={1350} preload/></div>
   <div className={styles.brandContent}><span className={styles.place}><MapPinned size={18} aria-hidden="true"/>Juntos por Xexéu</span><h2>Mais perto<br/>das pessoas.<br/>Mais presente<br/>na comunidade.</h2><p>Organização e compromisso para cuidar de quem faz parte da nossa história.</p></div>
   <div className={styles.features}><span><UsersRound size={19} aria-hidden="true"/>Pessoas</span><span><MapPinned size={19} aria-hidden="true"/>Comunidades</span><span><CalendarDays size={19} aria-hidden="true"/>Atividades</span></div>
   <div className={styles.ribbon} aria-hidden="true"/>
  </section>
  <section className={styles.access} aria-labelledby="login-title">
   <div className={styles.product}><span><Network size={23} aria-hidden="true"/></span><div><strong>CONECTA <b>2028</b></strong><p>Gestão comunitária</p></div></div>
   <div className={styles.card}>
    <div className={styles.welcomeIcon} aria-hidden="true"><LockKeyhole size={23}/></div>
    <h1 id="login-title">Boas-vindas!</h1><p className={styles.intro}>Entre na sua conta para acessar o sistema.</p>
    <form aria-busy={busy} onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setMessage('');const form=new FormData(e.currentTarget);try{const result=await auth.signIn.email({email:String(form.get('email')),password:String(form.get('password'))});if(result.error)setMessage('Não foi possível entrar. Confira seu e-mail e sua senha e tente novamente.');else window.location.assign('/');}catch{setMessage('Serviço indisponível. Tente novamente em instantes.');}finally{setBusy(false);}}}>
     <label htmlFor="login-email">E-mail</label><div className={styles.field}><Mail size={19} aria-hidden="true"/><input id="login-email" required type="email" name="email" autoComplete="username" spellCheck={false} placeholder="seuemail@exemplo.com" disabled={busy}/></div>
     <label htmlFor="login-password">Senha</label><div className={styles.field}><LockKeyhole size={19} aria-hidden="true"/><input id="login-password" required type={visible?'text':'password'} name="password" autoComplete="current-password" placeholder="Digite sua senha" disabled={busy}/><button className={styles.visibility} type="button" aria-label={visible?'Ocultar senha':'Mostrar senha'} aria-pressed={visible} aria-controls="login-password" onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={19} aria-hidden="true"/>:<Eye size={19} aria-hidden="true"/>}</button></div>
     {message&&<p className={styles.error} role="alert">{message}</p>}
     <Button className={styles.submit} disabled={busy} type="submit">{busy?'Entrando…':'Entrar no sistema'}{!busy&&<ArrowRight size={18} aria-hidden="true"/>}</Button>
    </form>
    <p className={styles.help}>Ainda não tem acesso ou precisa de ajuda?<br/>Procure a coordenação da sua equipe.</p>
    {process.env.NODE_ENV==='development'&&<a className={styles.setup} href="/configuracao-inicial">Configuração inicial do administrador</a>}
   </div>
   <p className={styles.security}><ShieldCheck size={17} aria-hidden="true"/>Acesso individual e protegido</p>
   <p className={styles.signature}>Trabalho e compromisso com o nosso povo.</p>
  </section>
 </main>;
}
