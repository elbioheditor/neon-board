!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customInstall
  ReadEnvStr $R9 "USERNAME"
  ${StrContains} $R8 "elbioh" $R9
  ${StrContains} $R7 "Elbioh" $R9

  ; SÓ cria atalho na área de trabalho se for instalação NOVA (NUNCA em atualizações!)
  ; E apenas se o atalho ainda não existir, prevenindo qualquer duplicata ou substituição indesejada
  ${ifNot} ${isUpdated}
    ${if} $R8 == ""
    ${andIf} $R7 == ""
      ; Computador do irmão (ShadowJoker)
      ${ifNot} ${FileExists} "$DESKTOP\ShadowJoker.lnk"
        CreateShortCut "$DESKTOP\ShadowJoker.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
      ${endIf}
    ${else}
      ; Computador do Elbioh (Neon)
      ${ifNot} ${FileExists} "$DESKTOP\Neon.lnk"
        CreateShortCut "$DESKTOP\Neon.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
      ${endIf}
    ${endIf}
  ${endIf}

  ${if} ${isUpdated}
    ${if} ${isForceRun}
    ${orIfNot} ${Silent}
      HideWindow
      StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "--updated"
    ${endIf}
    !insertmacro quitSuccess
  ${endIf}
!macroend

