function exemplo_dae_robertson
    % --------------------------------------------------------------
    % Exemplo DAE: Reações químicas de Robertson com lei de conservação
    % --------------------------------------------------------------
    % Sistema:
    % y1' = -0.04*y1 + 1e4*y2*y3
    % y2' =  0.04*y1 - 1e4*y2*y3 - 3e7*y2^2
    % 0   =  y1 + y2 + y3 - 1     (equação algébrica de conservação)
    %
    % A terceira equação torna o sistema uma DAE (índice 1).
    %
    % O solver ODE15s pode resolver DAEs de índice 1 através da matriz de massa M.
    % --------------------------------------------------------------

    % Condições iniciais
    y0 = [1; 0; 0];

    % Intervalo de integração (escala logarítmica)
    tspan = 4 * logspace(-6, 6, 400);  % 400 pontos entre 4e-6 e 4e6

    % Matriz de massa (torna a terceira equação algébrica)
    M = [1 0 0;
         0 1 0;
         0 0 0];    % última linha = 0 → sem derivada (restrição algébrica)

    % Opções do solver
    options = odeset('Mass', M, ...
                     'RelTol', 1e-6, ...
                     'AbsTol', [1e-8 1e-10 1e-8], ...
                     'Stats', 'on');   % 'on' mostra estatísticas no final

    % Integração numérica
    [t, y] = ode15s(@robertson_dae, tspan, y0, options);

    % Escalar y2 para visualização (é muito pequeno)
    y2_scaled = 1e4 * y(:,2);

    % --------------------------------------------------------------
    % Resultados
    % --------------------------------------------------------------
    figure('Name','Problema de Robertson - DAE','Color','w');
    semilogx(t, y(:,1), 'b-', 'LineWidth', 1.4); hold on;
    semilogx(t, y2_scaled, 'r--', 'LineWidth', 1.4);
    semilogx(t, y(:,3), 'g-.', 'LineWidth', 1.4);
    hold off;
    xlabel('Tempo (s)');
    ylabel('Concentração (mol/L)');
    legend('y_1', '1e4*y_2', 'y_3', 'Location', 'best');
    title('DAE: Problema de Robertson com lei de conservação (ODE15s)');
    grid on;

    % Verificação da conservação (y1+y2+y3=1)
    figure('Name','Verificação da conservação','Color','w');
    plot(t, y(:,1)+y(:,2)+y(:,3), 'k', 'LineWidth', 1.5);
    xlabel('Tempo (s)');
    ylabel('y_1 + y_2 + y_3');
    title('Verificação da lei de conservação (≈ 1)');
    grid on;
end


function dydt = robertson_dae(~, y)
    % --------------------------------------------------------------
    % Função do sistema de Robertson (DAE)
    % --------------------------------------------------------------
    dydt = zeros(3,1);
    dydt(1) = -0.04*y(1) + 1e4*y(2)*y(3);
    dydt(2) =  0.04*y(1) - 1e4*y(2)*y(3) - 3e7*y(2)^2;
    dydt(3) =  y(1) + y(2) + y(3) - 1;  % restrição algébrica
end