import { IonFooter, IonToolbar, IonText, IonIcon } from "@ionic/react";
import { logoGithub } from "ionicons/icons";

import styles from "./AppFooter.module.css";

export const AppFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <IonFooter>
      <IonToolbar>
        <div className={styles.content}>
          <IonText color="medium">
            <p className={styles.line}>&copy; {currentYear} Hinata Moriguchi</p>
          </IonText>
          <a
            href="https://github.com/guchipa/chordlens"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            className={styles.link}
          >
            <IonIcon icon={logoGithub} />
            GitHub Repository
          </a>
        </div>
      </IonToolbar>
    </IonFooter>
  );
};
