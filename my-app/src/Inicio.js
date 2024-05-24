import React from 'react';
import { Link } from 'react-router-dom';
import './Inicio.css';

const Inicio = () => {
  return (
    <div className="home-container">
      <header className="header">
        <div className="header-content">
          <h1>Bienvenido a Nuestra Plataforma</h1>
          <p>La mejor solución para encontrar y ofrecer servicios y trabajos.</p>
          <Link to="/register" className="btn btn-primary">Únete Ahora</Link>
        </div>
      </header>

      <section className="about">
        <h2>¿Quiénes Somos?</h2>
        <p>Somos una plataforma dedicada a conectar a personas que buscan servicios con profesionales que los ofrecen. Además, ayudamos a aquellos que buscan empleo a encontrar las mejores oportunidades laborales.</p>
      </section>

      <section className="features">
        <h2>Nuestras Características</h2>
        <div className="feature-list">
          <div className="feature-item">
            <h3>Fácil de Usar</h3>
            <p>Interfaz intuitiva y fácil de usar para todos los usuarios.</p>
          </div>
          <div className="feature-item">
            <h3>Variedad de Servicios</h3>
            <p>Encuentra una amplia gama de servicios disponibles a tu disposición.</p>
          </div>
          <div className="feature-item">
            <h3>Oportunidades de Trabajo</h3>
            <p>Conéctate con empleadores y encuentra el trabajo de tus sueños.</p>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <h2>Testimonios</h2>
        <div className="testimonial-list">
          <div className="testimonial-item">
            <p>"Esta plataforma me ha ayudado a encontrar empleo rápidamente. Muy recomendable!"</p>
            <h4>- Juan Pérez</h4>
          </div>
          <div className="testimonial-item">
            <p>"He podido ofrecer mis servicios y encontrar nuevos clientes fácilmente. Excelente herramienta."</p>
            <h4>- María López</h4>
          </div>
        </div>
      </section>

    
    </div>
  );
};

export default Inicio;
