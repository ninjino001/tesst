import '../styles/home.css'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageSwitcher from '../components/LanguageSwitcher'

function HomePage() {
  const { t } = useLanguage()

  return (
    <div className="home-root">
      <header className="home-header">
        <img src="/logo.png" alt="AIMOS" className="home-logo" />
        <nav className="home-nav">
          <a href="#about">{t('nav.about')}</a>
          <a href="#features">{t('nav.features')}</a>
          <div style={{ marginLeft: 12 }}>
            <LanguageSwitcher />
          </div>
        </nav>
      </header>

      <section className="home-hero">
        <div className="hero-content">
          <h1><br/>{t('hero.line1')}<br/>{t('hero.line2')}<br/><span className="highlight">{t('hero.line3')}</span></h1>
          <p>{t('hero.description')}</p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">{t('cta.login')}</Link>
          </div>
        </div>
      </section>

      <section id="features" className="home-features">
        <div className="feature">
          <h3>{t('features.f1_title')}</h3>
          <p>{t('features.f1_desc')}</p>
        </div>
        <div className="feature">
          <h3>{t('features.f2_title')}</h3>
          <p>{t('features.f2_desc')}</p>
        </div>
        <div className="feature">
          <h3>{t('features.f3_title')}</h3>
          <p>{t('features.f3_desc')}</p>
        </div>
        <div className="feature">
          <h3>{t('features.f4_title')}</h3>
          <p>{t('features.f4_desc')}</p>
        </div>
      </section>
      <section id="about" className="home-about">
        <div className="about-inner">
          <div className="aimos-caption">{t('about.caption')}</div>
          <div className="creator">{t('about.creator')}</div>
        </div>
      </section>
      <img src="/Airports-morocco.png" alt="Airports of Morocco" className="aom-logo" />
    </div>
  )
}

export default HomePage
