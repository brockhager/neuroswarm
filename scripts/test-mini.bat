@echo on  
where ipfs >nul 2>&1  
if %0% equ 0 (  
echo ipfs ok  
) else (  
echo ipfs missing  
)  
where ollama >nul 2>&1  
if %0% equ 0 (  
echo ollama present  
) else (  
echo missing  
)  
start " "NS-LLM cmd /k echo" "child  ; echo timeout /t 1 /nobreak >nul  ; echo where docker >nul 2>&1  ; echo if %0% equ 0 (  ; echo echo docker ok  ; echo ) else (  ; echo echo docker missing  ; echo )  ; type c:\JS\ns\neuroswarm\scripts\test-mini.bat 
