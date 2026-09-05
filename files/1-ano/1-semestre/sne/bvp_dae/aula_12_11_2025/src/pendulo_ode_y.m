function pendulo_ode_y
    % --------------------------------------------------------
    % Pêndulo simples - sistema ODE após eliminação da equação algébrica
    % y1 = X, y2 = Y, y3 = U, y4 = V
    % --------------------------------------------------------

    % Parâmetros físicos
    m = 1.0;   % já não entra explicitamente
    l = 1.0;   % comprimento do fio (m)
    g = 9.81;  % aceleração gravítica (m/s^2)

    % Ângulo inicial (radianos)
    theta0 = pi/6;   % 30°

    % Condições iniciais coerentes
    y1_0 = l * sin(theta0);   % X
    y2_0 = l * cos(theta0);   % Y
    y3_0 = 0.0;               % U
    y4_0 = 0.0;               % V
    y0 = [y1_0; y2_0; y3_0; y4_0];

    % Intervalo de simulação
    tspan = [0 10];

    % Integração numérica
    [t, y] = ode45(@(t,y) penduloODE(t,y,l,g), tspan, y0);

    % Resultados
    y1 = y(:,1); y2 = y(:,2);
    y3 = y(:,3); y4 = y(:,4);

    % --- Gráficos ---
    figure('Name','Pêndulo - Sistema ODE','Color','w');
    subplot(3,1,1);
    plot(t, y1, 'b', t, y2, 'r', 'LineWidth', 1.5);
    ylabel('Posição (m)');
    legend('y_1 = X','y_2 = Y','Location','best');
    grid on;

    subplot(3,1,2);
    plot(t, y3, 'b', t, y4, 'r', 'LineWidth', 1.5);
    ylabel('Velocidade (m/s)');
    legend('y_3 = U','y_4 = V','Location','best');
    grid on;

    subplot(3,1,3);
    energia = 0.5*(y3.^2 + y4.^2) + g*y2;
    plot(t, energia, 'k', 'LineWidth', 1.2);
    ylabel('Energia total (J/kg)');
    xlabel('Tempo (s)');
    grid on;
    title('Energia específica (verificar conservação)');

    % Trajetória XY
    figure('Name','Trajetória XY','Color','w');
    plot(y1, y2, 'LineWidth', 1.5);
    axis equal; grid on;
    xlabel('y_1 = X (m)'); ylabel('y_2 = Y (m)');
    title('Pêndulo simples - Trajetória (modelo ODE)');
end


function dydt = penduloODE(~, y, l, g)
    % --------------------------------------------------------
    % Sistema de ODEs do pêndulo após eliminação de T
    % --------------------------------------------------------
    y1 = y(1); y2 = y(2); y3 = y(3); y4 = y(4);

    dydt = zeros(4,1);
    dydt(1) = y3;                                   % dX/dt = U
    dydt(2) = y4;                                   % dY/dt = V
    dydt(3) = -(y1)*(y3^2 + y4^2 + y2);             % dU/dt
    dydt(4) = -(y2)*(y3^2 + y4^2 + y2) + 1;         % dV/dt
end