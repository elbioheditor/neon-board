!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customInstall
  ReadEnvStr $R9 "USERNAME"
  ${StrContains} $R8 "elbioh" $R9
  ${StrContains} $R7 "Elbioh" $R9
  ${if} $R8 == ""
  ${andIf} $R7 == ""
    ${if} ${FileExists} "$DESKTOP\Neon.lnk"
      Delete "$DESKTOP\ShadowJoker.lnk"
      Rename "$DESKTOP\Neon.lnk" "$DESKTOP\ShadowJoker.lnk"
      StrCpy $launchLink "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    ${endIf}
  ${endIf}

  ${if} ${isUpdated}
    ${if} ${isForceRun}
    ${orIfNot} ${Silent}
      HideWindow
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "--updated"
    ${endIf}
    !insertmacro quitSuccess
  ${endIf}
!macroend
