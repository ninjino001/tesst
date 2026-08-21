\LoadClass[a4paper,12pt]{report} % Classe du document

%--------------------- Packages ------------------------


\RequirePackage{titlesec} % For customizing chapter and section titles
\RequirePackage{tocloft} % For customizing the table of contents


\RequirePackage[french]{babel} % Langue du document
\RequirePackage[utf8]{inputenc} % Caractères spéciaux
\RequirePackage[section]{placeins} % Pour placement de section
\RequirePackage[T1]{fontenc} % Quelques lettres qui sont pas inclus dans UTF-8
\RequirePackage{mathtools} % Paquet pour des équations et symboles mathématiques
\RequirePackage{siunitx} % Pour écrire avec la notation scientifique (Ex.: \num{2e+9})
\RequirePackage{float} % Pour placement d'images
\RequirePackage{graphicx} % Paquet pour insérer des images
\RequirePackage[justification=centering]{caption} % Pour les légendes centralisées
\RequirePackage{subcaption}
\RequirePackage{wallpaper}
\RequirePackage{nomencl}
%\makenomenclature
\RequirePackage{fancyhdr}
\RequirePackage{fancybox}
\RequirePackage{url}
\RequirePackage[hidelinks]{hyperref}%Paquet pour insérer légendes dans des sous-figures comme Figure 1a, 1b
\RequirePackage[left=2.5cm,right=2.5cm,top=2cm,bottom=3.5cm]{geometry} % Configuration de la page

% Customize chapter titles to match book document class
\titleformat{\chapter}[display]
  {\normalfont\huge\bfseries}{\chaptertitlename\ \thechapter}{20pt}{\Huge}
\titlespacing*{\chapter}
  {0pt}{-10pt}{10pt}

  
% Customize section titles to match book document class
\titleformat{\section}
  {\normalfont\Large\bfseries}{\thesection}{1em}{}
%-------------------- Informations sur le rapport ----------------------

\newcommand{\UE}[1]{\renewcommand{\UE}{#1}}
\newcommand{\sujet}[1]{\renewcommand{\sujet}{#1}}
\newcommand{\titre}[1]{\renewcommand{\titre}{#1}}
\newcommand{\enseignant}[1]{\renewcommand{\enseignant}{#1}}
\newcommand{\elevesname}{ }
\newcommand{\eleves}[1]{\renewcommand{\elevesname}{#1}}
\newcommand{\encadrantname}{ }
\newcommand{\encadrant}[1]{\renewcommand{\encadrantname}{#1}}
\newcommand{\juryname}{ }
\newcommand{\jury}[1]{\renewcommand{\juryname}{#1}}
\newcommand{\anneename}{ }
\newcommand{\annee}[1]{\renewcommand{\anneename}{#1}}


\newcommand{\fairemarges}{
    \fancyhf{} %Clear Everything.
    \fancyheadoffset{1cm}
    \setlength{\headheight}{1.5cm}
    \fancyfoot[C]{\thepage} %Page Number
    \renewcommand{\headrulewidth}{1pt} %0pt for no rule, 2pt thicker etc...
    \renewcommand{\footrulewidth}{1pt}
    \fancyfoot[L]{Rapport PFA} % BOTTOM LEFT
    \fancyfoot[R]{2025-2026} % BOTTOM RIGHT
    \fancyhead[L]{\nouppercase{\leftmark}} % TOP LEFT
    \fancyhead[R]{} % TOP RIGHT
    \pagestyle{fancy}
}

\newcommand{\fairepagedegarde}{
\begin{titlepage}
\ThisCenterWallPaper{1}{Logos/background.png}
    
    %\vspace{-2cm}
    %\includegraphics[width=0.2\textwidth]{Logos/um5.png}
    %\hfill
    \centering %Centraliser le contenu
    %\hspace{-2cm}
    \includegraphics[width=0.25\textwidth]{Logos/ensias.png}\hfill
    \includegraphics[width=0.3\textwidth]{Logos/um5.png}\par\vspace{1cm} %Insertion du logo
    {\scshape\large École Nationale Supérieure d'Informatique et d'Analyse des Systèmes\par} %Nom de l'université
    \vspace{1cm}%Espace de 1,5cm
    {\scshape\Large \UE \par \sujet \par} %sous-titre
    \vspace{1cm}%Espace de 1cm
    \rule{\linewidth}{0.2 mm} \par \vspace{0.4cm}
    {\huge\bfseries \titre \par}
    \rule{\linewidth}{0.2 mm} \par \vspace{1.5cm}
    \vspace{-1.2cm}
    
    \begin{minipage}{0.45\textwidth}
        \begin{flushleft} \large
            \textbf{Élèves :}\par
            \elevesname\par
            \vspace{0.5cm}
            \textbf{Encadrant :}\par
            \encadrantname\par
        \end{flushleft}
    \end{minipage}
    \hfill
    \begin{minipage}{0.45\textwidth}
        \begin{center} \large
            \textbf{Jury :}\par
            \juryname\par
        \end{center}
    \end{minipage}
    \vspace{1cm}
    \par
    \begin{minipage}{1\textwidth}
        \begin{center} \large
            \textbf{Année Universitaire}\par
            \anneename
        \end{center}
    \end{minipage}
\end{titlepage}
}

\newcommand{\tabledematieres}{
\tableofcontents
\newpage
}

\newcommand{\insererfigure}[4]{

}