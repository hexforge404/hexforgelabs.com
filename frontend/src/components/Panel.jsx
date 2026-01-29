import React from "react";
import "./Panel.css";

function Panel({ eyebrow, title, actions, children, footer, className = "" }) {
  const classes = ["hf-panel"];
  if (className) classes.push(className);

  return (
    <section className={classes.join(" ")}>
      <div className="hf-panel__header">
        <div className="hf-panel__titles">
          {eyebrow && <p className="hf-panel__eyebrow">{eyebrow}</p>}
          {title && <h2 className="hf-panel__title">{title}</h2>}
        </div>
        {actions ? <div className="hf-panel__actions">{actions}</div> : null}
      </div>

      <div className="hf-panel__body">{children}</div>

      {footer ? <div className="hf-panel__footer">{footer}</div> : null}
    </section>
  );
}

export default Panel;
