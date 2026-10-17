!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

!macro customInstall
  ${if} ${isUpdated}
    ${if} ${isForceRun}
    ${orIfNot} ${Silent}
      HideWindow
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "--updated"
    ${endIf}
    !insertmacro quitSuccess
  ${endIf}
!macroend
